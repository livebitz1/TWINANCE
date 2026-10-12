"use client";

import {
  BankStatementData,
  Transaction,
  normalizeTransactionDate,
  recalculateSummaryFromTransactions,
  buildBudgetDataFromTransactions,
} from "./bankStatementService";
import { IndianBankStatementParser } from "./advancedBankStatementParser";
import { parseIndianBankStatement } from "./bankStatementParser";
import { UniversalBankStatementParser } from "./universalBankStatementParser";

// Requests go through this app's own server route, which holds the API key.
// Calling Google directly from here would require a NEXT_PUBLIC_ key, and that
// prefix ships the key to every visitor's browser.
const GEMINI_PROXY_URL = "/api/gemini-chat";

// Tuning knobs for extraction speed.
// Output tokens dominate latency, so transactions are emitted as compact pipe-delimited
// rows instead of verbose JSON objects, and long statements are split across parallel
// requests so wall time stays flat as the statement grows.
// Every chunk costs one API request, and the Gemini free tier allows only 20
// requests per day, so chunking is deliberately conservative: a normal monthly
// statement stays a single request, and only genuinely long statements split.
const MAX_PARALLEL_CHUNKS = 6;
const MIN_TXN_LINES_PER_CHUNK = 40;

const CATEGORY_LIST = [
  "Food", "Shopping", "Transport", "Bills", "Entertainment",
  "Health", "Education", "Salary", "Transfer", "UPI", "Other",
];
const CATEGORIES = CATEGORY_LIST.join(", ");

const TXN_RULES = `Extract every transaction from this bank statement section.

Output plain text, one transaction per line, pipe separated, NOTHING else:
TYPE|DATE|AMOUNT|BALANCE|DESCRIPTION|CATEGORY

TYPE: C for credit/deposit, D for debit/withdrawal
DATE: the transaction date, DD/MM/YYYY
AMOUNT: the transaction amount, digits only, no commas or currency symbols
BALANCE: the running closing balance shown after this transaction, digits only,
         keep a leading minus if negative, no commas. Use 0 if not shown.
DESCRIPTION: the narration text from the statement, max 60 characters
CATEGORY: exactly one of ${CATEGORIES}

Rules:
- A transaction begins on a line that starts with a date. Its narration may wrap
  across the following lines, and the amount and running balance usually appear
  together at the end of the row (for example "5.00-387,508.63" means an amount
  of 5.00 leaving a balance of -387,508.63). Emit ONE line per transaction.
- Extract ONLY transactions visible in the text. Never invent or assume data.
- No markdown, no code fences, no JSON, no commentary, no header row.
- If no transactions are present, output nothing.`;

// Folded into the first chunk's request rather than sent as its own call, to
// spend one fewer request out of the daily quota.
const HEADER_RULES = `Additionally, before the transaction lines, output exactly one account-details line:
HEADER|accountHolder|accountNumber|accountType|bankName|startDate|endDate|closingBalance

Dates are DD/MM/YYYY. closingBalance is digits only (may be negative), no commas.
Use the text UNKNOWN for any account field that is not present.`;

/**
 * Single Gemini call. The proxy route targets gemini-flash-lite-latest, which has
 * no "thinking" mode to disable in the first place, and retries the transient
 * 429/503 responses the API returns under load.
 */
async function callGemini(prompt: string, maxOutputTokens: number): Promise<string> {
  const body = JSON.stringify({
    prompt,
    config: {
      temperature: 0, // deterministic: same statement must give the same result
      maxOutputTokens,
    },
  });

  // Running chunks in parallel raises the request rate, so 429s are expected on
  // smaller quotas. Back off and retry rather than dropping to the local parsers,
  // which produce far worse data than simply waiting a moment.
  const backoffMs = [700, 1800, 4000];

  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    const response = await fetch(GEMINI_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      const result = await response.json();
      return result?.response ?? "";
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === backoffMs.length) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    await new Promise((r) => setTimeout(r, backoffMs[attempt]));
  }

  return "";
}

/** True when a line looks like it starts a transaction row. */
function isTxnLine(line: string): boolean {
  // Anchored at the line start on purpose: a wrapped narration line often carries
  // the *value* date mid-line, and treating those as row starts would cut
  // transactions in half at chunk boundaries.
  return /^\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(line);
}

/**
 * Split the statement on transaction boundaries so no row is ever cut in half,
 * capping the number of parallel requests.
 */
function chunkStatement(text: string): string[] {
  const lines = text.split("\n");
  const starts = lines.map((l, i) => (isTxnLine(l) ? i : -1)).filter((i) => i >= 0);

  if (starts.length <= MIN_TXN_LINES_PER_CHUNK) return [text];

  const perChunk = Math.max(
    MIN_TXN_LINES_PER_CHUNK,
    Math.ceil(starts.length / MAX_PARALLEL_CHUNKS)
  );

  const chunks: string[] = [];
  for (let i = 0; i < starts.length; i += perChunk) {
    // The first chunk keeps the preamble above the rows, because that is where
    // the account holder, account number, bank name and period are printed.
    const from = i === 0 ? 0 : starts[i];
    const next = starts[i + perChunk];
    const to = next === undefined ? lines.length : next;
    const chunk = lines.slice(from, to).join("\n").trim();
    if (chunk) chunks.push(chunk);
  }
  return chunks.length ? chunks : [text];
}

/** Pull the merchant name and UPI id out of a narration locally, instead of paying
 *  the model to echo them back for every single row. */
function deriveMerchant(description: string): { merchant: string; upiId?: string } {
  // The hyphen is the field separator in these narrations, so it must not be part
  // of the VPA or the match runs backwards into the previous field.
  const upiId = description.match(/[A-Za-z0-9._]+@[A-Za-z]{2,}/)?.[0];

  let merchant = "";
  const upiParts = description.split("-");
  if (/^UPI/i.test(description) && upiParts.length > 1) {
    merchant = upiParts[1].trim();
  } else {
    merchant = description.split(/[-/|]/)[0].trim();
  }

  return { merchant: merchant.slice(0, 40), upiId };
}

const DATE_FIELD_RE = /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/;

/**
 * Turn the compact pipe rows back into Transaction objects.
 *
 * Reading by fixed field position (type|date|amount|balance|desc|category) is
 * the common case, but occasionally the model inserts a stray extra field - seen
 * in practice as "D|C|20/06/2025|...", one field too many. A position-based read
 * would land on "C" where a date is expected, fail to parse it, and silently
 * drop the whole transaction. Locating the date by its actual shape rather than
 * its position recovers these rows instead of losing real transactions.
 */
function parseTxnRows(raw: string, startIndex: number): Transaction[] {
  const out: Transaction[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!/^[CD]\s*\|/i.test(trimmed)) continue;

    const fields = trimmed.split("|").map((f) => f.trim());

    // The date is expected at index 1; search a little further in case of one
    // stray extra field ahead of it.
    let dateIdx = fields.findIndex((f, i) => i >= 1 && i <= 3 && DATE_FIELD_RE.test(f));
    if (dateIdx === -1) continue; // nothing recognisable as a date at all

    const date = normalizeTransactionDate(fields[dateIdx]);
    if (!date) continue;

    // Type is whichever of the fields before the date is a bare C or D; default
    // to the very first field, which is correct in the overwhelming majority of
    // rows and in the observed malformed case alike.
    const typeField = fields.slice(0, dateIdx).find((f) => /^[CD]$/i.test(f)) ?? fields[0];

    const amount = Number((fields[dateIdx + 1] || "").replace(/[^\d.\-]/g, ""));
    if (!Number.isFinite(amount) || amount === 0) continue;

    const balance = Number((fields[dateIdx + 2] || "").replace(/[^\d.\-]/g, ""));

    // Whatever remains is [...description pieces, category]. The category is
    // only trusted as the last field when it matches the known list - otherwise
    // treat everything remaining as description and fall back to "Other".
    const rest = fields.slice(dateIdx + 3);
    const lastField = rest[rest.length - 1] || "";
    const hasKnownCategory = CATEGORY_LIST.some((c) => c.toLowerCase() === lastField.toLowerCase());
    const category = hasKnownCategory ? lastField : "Other";
    const descParts = hasKnownCategory ? rest.slice(0, -1) : rest;
    const description = descParts.join(" ").trim() || "Unknown Transaction";

    const { merchant, upiId } = deriveMerchant(description);

    out.push({
      id: `trans-${startIndex + out.length + 1}`,
      balanceAfter: Number.isFinite(balance) ? balance : undefined,
      date,
      description,
      amount: Math.abs(amount),
      type: typeField.toUpperCase() === "C" ? "credit" : "debit",
      category,
      merchant,
      upiId,
    });
  }

  return out;
}

/**
 * Decide credit vs debit from the running balance instead of trusting the model.
 *
 * PDF text extraction concatenates the statement's columns, so "5.00-387,508.63"
 * carries no clue about whether 5.00 sat in the withdrawal or the deposit column
 * and the model has to guess. The balance column is unambiguous: if the balance
 * rose by exactly the transaction amount, money came in.
 *
 * The model's own answer is only overridden when the arithmetic matches to the
 * paisa, so a misread balance leaves the original classification alone.
 */
function correctTypesFromBalances(transactions: Transaction[]): number {
  let corrected = 0;

  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1].balanceAfter;
    const curr = transactions[i].balanceAfter;
    if (prev === undefined || curr === undefined || prev === 0 || curr === 0) continue;

    const delta = curr - prev;
    const amount = transactions[i].amount;
    if (Math.abs(Math.abs(delta) - amount) > 0.011) continue; // evidence not clean

    const implied = delta > 0 ? "credit" : "debit";
    if (transactions[i].type !== implied) {
      transactions[i].type = implied;
      corrected++;
    }
  }

  return corrected;
}

/** Parse the single account-details line. */
function parseHeaderRow(raw: string): {
  accountDetails?: BankStatementData["accountDetails"];
  statementPeriod?: BankStatementData["statementPeriod"];
  closingBalance: number;
} {
  // Must be the HEADER row specifically: the same response also carries the
  // transaction rows, which are pipe separated too.
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^HEADER\s*\|/i.test(l));

  if (!line) return { closingBalance: 0 };

  const clean = (v?: string) => {
    const t = (v || "").trim();
    return !t || t.toUpperCase() === "UNKNOWN" ? "" : t;
  };

  const p = line.replace(/^HEADER\s*\|/i, "").split("|");
  const closing = Number(String(p[6] || "").replace(/[^\d.\-]/g, ""));

  return {
    accountDetails: {
      accountHolder: clean(p[0]),
      accountNumber: clean(p[1]),
      accountType: clean(p[2]),
      bankName: clean(p[3]),
    },
    statementPeriod: {
      startDate: normalizeTransactionDate(clean(p[4])) || clean(p[4]),
      endDate: normalizeTransactionDate(clean(p[5])) || clean(p[5]),
    },
    closingBalance: Number.isFinite(closing) ? closing : 0,
  };
}

/** Last-resort local parsers. They are low quality, but better than no result. */
function runFallbackParsers(textContent: string): BankStatementData | null {
  try {
    return (
      UniversalBankStatementParser.parseStatement(textContent) ||
      IndianBankStatementParser.parseStatement(textContent) ||
      parseIndianBankStatement(textContent)
    );
  } catch (error) {
    console.error("All fallback parsers failed:", error);
    return null;
  }
}

export async function analyzeStatementWithGemini(
  textContent: string,
  file?: File
): Promise<BankStatementData | null> {
  void file;

  try {
    if (!textContent) throw new Error("No extracted text provided");

    // No key check here: the key lives on the server, so this code cannot see it.
    // A missing or rejected key surfaces as a failed proxy call and is handled by
    // the catch below, which falls back to the local parsers.

    // Guard against raw PDF bytes reaching the model.
    const binaryMarkers = ["%PDF", "/Type", "endobj", "stream", "/Filter"];
    if (binaryMarkers.some((m) => textContent.includes(m))) {
      throw new Error("Binary PDF data detected - text extraction failed.");
    }

    const chunks = chunkStatement(textContent);
    const started = Date.now();
    console.log(`Gemini analysis: ${textContent.length} chars in ${chunks.length} request(s)`);

    // All chunks go out together, so wall time is the slowest single request
    // rather than the sum. The first one also returns the account header.
    const txnRaws = await Promise.all(
      chunks.map((c, i) =>
        callGemini(
          i === 0
            ? `${TXN_RULES}\n\n${HEADER_RULES}\n\nSTATEMENT SECTION:\n${c}`
            : `${TXN_RULES}\n\nSTATEMENT SECTION:\n${c}`,
          8192
        )
      )
    );

    const transactions: Transaction[] = [];
    for (const raw of txnRaws) {
      transactions.push(...parseTxnRows(raw, transactions.length));
    }
    const headerRaw = txnRaws[0];

    console.log(
      `Gemini analysis complete in ${((Date.now() - started) / 1000).toFixed(1)}s - ${transactions.length} transactions`
    );

    if (transactions.length === 0) {
      throw new Error("Gemini could not extract meaningful data from the PDF text.");
    }

    const corrected = correctTypesFromBalances(transactions);
    if (corrected > 0) {
      console.log(`Corrected ${corrected} credit/debit classification(s) from the balance column`);
    }

    const { accountDetails, statementPeriod, closingBalance } = parseHeaderRow(headerRaw);

    // Totals and chart data are computed locally from the extracted rows: the
    // model is never asked to do arithmetic it would only be billed to echo back.
    const recalc = recalculateSummaryFromTransactions(transactions);
    const { daily } = buildBudgetDataFromTransactions(transactions);

    return {
      totalBalance: `₹${closingBalance.toLocaleString("en-IN")}`,
      income: `₹${recalc.income.toLocaleString("en-IN")}`,
      expenses: `₹${recalc.expenses.toLocaleString("en-IN")}`,
      incomeTransactions: recalc.incomeTransactions,
      expenseTransactions: recalc.expenseTransactions,
      comparedToLastMonth: "₹0",
      budgetData: daily,
      transactions,
      accountDetails,
      statementPeriod,
    };
  } catch (error) {
    console.error("Error analyzing statement with Gemini:", error);
    console.log("Attempting fallback parsing: Universal -> Advanced -> Simple...");
    return runFallbackParsers(textContent);
  }
}
