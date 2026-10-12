# Twinance — Project Synopsis

## 1. Title
**Twinance — An AI-Integrated Personal Finance Tracker for Bank Statements, UPI and Web3 Wallets**

## 2. Abstract
Twinance is a web application that converts a raw bank statement PDF into a structured, explorable financial dashboard. A user signs in, uploads a statement, and the system extracts every transaction, categorises it, computes income/expense/savings summaries, visualises spending, and lets the user ask natural-language questions about their own money ("how much did I spend on food in June?"). A parallel Web3 module extends the same idea to a Solana wallet, so both traditional (bank/UPI) and on-chain finances can be viewed in one place.

## 3. Problem Statement
Bank statements are delivered as PDFs designed for printing, not for analysis. As a result:
- Users cannot easily see **where their money actually goes** — the statement is a flat list of cryptic UPI/NEFT strings, not categorised spending.
- Every bank uses a **different statement layout**, so generic tools break; some statements are scanned images with no text layer at all.
- Existing account-aggregator apps require the user to **hand over bank credentials**, which most users are unwilling to do.
- Crypto holdings live in a **completely separate** wallet app, so no single view of net worth exists.

**Twinance solves this**: upload a PDF (no credentials, no bank linking), get an accurate, categorised, queryable picture of your finances — plus an optional wallet view.

## 4. Objectives
1. Extract text reliably from bank-statement PDFs of any bank, including scanned/image PDFs.
2. Parse the extracted text into normalised transaction records (date, description, amount, credit/debit, balance, merchant, UPI ID).
3. Auto-categorise transactions (Food, Shopping, Transport, Bills, Transfers, UPI, etc.).
4. Compute and display financial summaries: total balance, income, expenses, transaction counts, category-wise budget breakdown.
5. Provide an AI assistant that answers natural-language questions grounded in the user's real transactions.
6. Guarantee **deterministic** output — the same statement must always produce the same numbers (essential for financial trust).
7. Provide a Web3 dashboard showing SOL balance, SPL tokens, NFTs and transactions for a connected Phantom wallet.

## 5. Scope
**In scope:** PDF statement upload and parsing, transaction extraction and categorisation, dashboard visualisation, AI Q&A over the user's data, authentication, client-side caching, Solana wallet read-only view.
**Out of scope:** initiating payments or transfers, direct bank API/account-aggregator integration, multi-user shared accounts, a persistent server-side database (current build keeps data client-side per session).

## 6. Proposed System / Methodology
**Pipeline: Upload → Extract → Parse → Analyse → Visualise → Converse**

1. **Upload** — `BankStatementUpload` accepts a PDF from the authenticated user.
2. **Extraction (multi-layer fallback)** — for robustness across bank formats:
   - *Server:* `/api/parse-statement` and `/api/extract-pdf` use `pdf-parse`, with a readability check (rejects garbled output below a 30% readable-character ratio).
   - *Client:* PDF.js text-layer extraction (`utils/pdfUtils.ts`).
   - *OCR:* Tesseract.js (`utils/ocrUtils.ts`) for scanned, image-only statements.
   - *Emergency:* raw-buffer pattern extraction as a last resort.
3. **Parsing** — a layered parser stack (`universalBankStatementParser`, `advancedBankStatementParser`, `transactionParser`) applies regex pattern sets (date-amount-balance rows, UPI-specific patterns) to build transaction objects, with date normalisation to a single `DD/MM/YYYY` format.
4. **AI analysis** — `geminiService` sends the extracted text to Google Gemini with a structured prompt and **temperature 0**, returning strict JSON: account details, statement period, transactions, categories and totals.
5. **Verification** — summaries are recomputed from the parsed transactions (`recalculateSummaryFromTransactions`) rather than trusting the model's arithmetic.
6. **Caching for determinism** — `cacheService` hashes each file and caches results in memory and `localStorage`, so re-uploading the same statement returns identical results.
7. **Visualisation** — Recharts-based `BudgetChart`, `FinancialSummaryCard` tiles, and a filterable/searchable `TransactionHistory` table.
8. **Conversational layer** — `AIFinancialChatService` classifies each query into one of eleven intents (monthly summary, category analysis, merchant search, comparison, trend analysis, budget advice, anomaly detection, savings tips, …), retrieves the relevant transactions locally, and asks Gemini to answer using only that grounded data via the `/api/gemini-chat` server proxy.
9. **Web3 module** — Phantom wallet connect + Solana JSON-RPC (`getBalance`, `getTokenAccountsByOwner`) rendered in `Web3EnhancedDashboard`.

## 7. System Architecture (layers)
| Layer | Components |
|---|---|
| Presentation | Next.js App Router pages: `/` landing, `/dashboard`, `/web3-dashboard`, `/sign-in`, `/sign-up` |
| UI | React 19 + Tailwind CSS + shadcn/ui + Recharts |
| State | `BankStatementContext` (React Context), `use-toast` hook |
| Services | `bankStatementService`, `geminiService`, `aiChatService`, `financialAnalytics`, `cacheService`, parser stack |
| API (server) | `/api/parse-statement`, `/api/extract-pdf`, `/api/gemini-chat` |
| Auth | Clerk, enforced via `middleware.ts` |
| External | Google Gemini API, Solana RPC, Phantom wallet |

## 8. Technology Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 3, shadcn/ui (Radix), Recharts, lucide-react
- **Authentication:** Clerk (`@clerk/nextjs`)
- **AI:** Google Gemini (`gemini-flash-latest`) via a server-side proxy route
- **PDF / OCR:** pdf-parse, pdfjs-dist, tesseract.js
- **Web3:** Phantom wallet, Solana JSON-RPC
- **Tooling:** ESLint, PostCSS, TypeScript strict types

## 9. Key Features
- Credential-free onboarding — upload a PDF, no bank login required
- Bank-agnostic "universal" parser with four-tier extraction fallback (incl. OCR for scanned statements)
- Automatic transaction categorisation and merchant/UPI-ID detection
- Income, expense, balance and category-budget dashboards
- Natural-language financial assistant grounded in the user's own transactions
- Deterministic, cached analysis — identical results for identical input
- Secure routes via Clerk middleware; financial data kept client-side
- Optional Solana wallet dashboard (balance, tokens, NFTs, transactions)

## 10. Expected Outcome
A working web application in which a user, within roughly a minute of uploading a statement, sees an accurate categorised breakdown of their spending and can interrogate it conversationally — replacing manual spreadsheet entry and eliminating the need to share banking credentials with a third party.

## 11. Current Status
The core pipeline (auth → upload → extraction → Gemini analysis → dashboard → AI chat) is implemented and functional. Known gaps and clean-up items:
- `README.md` still contains an unresolved Git merge conflict (`<<<<<<< HEAD` / `>>>>>>>`).
- Several duplicate/legacy files remain (`client-dashboard-fixed.tsx`, `page-new.tsx`, `page-clean.tsx`, `.bak`/`.new` files) and a number of empty placeholder modules.
- `AIInsights` is commented out of the dashboard.
- The Web3 dashboard points at a placeholder RPC endpoint and needs a real Solana RPC provider configured.
- `NEXT_PUBLIC_GEMINI_API_KEY` is exposed as a public env var; it should be a server-only secret since a proxy route already exists.
- No persistent database — analysis lives in browser cache only.

## 12. Future Scope
- Server-side database for statement history and multi-month trend analysis
- Multi-statement / multi-account aggregation and true net-worth view (fiat + crypto combined)
- Budget goals, alerts and anomaly/fraud flagging surfaced proactively
- Export to CSV/Excel and tax-ready reports
- Mobile-responsive PWA or native app
- Expanded chain support beyond Solana
