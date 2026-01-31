/**
 * Date Query Parser
 * Parses natural language date queries into date ranges
 */

export interface DateRange {
    start: string; // DD/MM/YYYY
    end: string;   // DD/MM/YYYY
    type: 'day' | 'week' | 'month' | 'year' | 'range';
}

export class DateQueryParser {
    /**
     * Parse natural language date query
     * Examples: "last month", "January", "15th Jan", "this week"
     */
    static parse(query: string): DateRange | null {
        const lowerQuery = query.toLowerCase().trim();

        // Try different parsing strategies
        return (
            this.parseRelativeDate(lowerQuery) ||
            this.parseMonthName(lowerQuery) ||
            this.parseSpecificDate(lowerQuery) ||
            this.parseYear(lowerQuery) ||
            this.parseWeek(lowerQuery)
        );
    }

    /**
     * Parse relative dates: "last month", "this month", "last week"
     */
    private static parseRelativeDate(query: string): DateRange | null {
        const now = new Date();

        // Last month
        if (query.includes('last month') || query.includes('previous month')) {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
            return {
                start: this.formatDate(lastMonth),
                end: this.formatDate(lastDay),
                type: 'month'
            };
        }

        // This month
        if (query.includes('this month') || query.includes('current month')) {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return {
                start: this.formatDate(firstDay),
                end: this.formatDate(lastDay),
                type: 'month'
            };
        }

        // Last week
        if (query.includes('last week') || query.includes('previous week')) {
            const lastWeekStart = new Date(now);
            lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
            return {
                start: this.formatDate(lastWeekStart),
                end: this.formatDate(lastWeekEnd),
                type: 'week'
            };
        }

        // This week
        if (query.includes('this week') || query.includes('current week')) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return {
                start: this.formatDate(weekStart),
                end: this.formatDate(weekEnd),
                type: 'week'
            };
        }

        // Today
        if (query.includes('today')) {
            return {
                start: this.formatDate(now),
                end: this.formatDate(now),
                type: 'day'
            };
        }

        // Yesterday
        if (query.includes('yesterday')) {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return {
                start: this.formatDate(yesterday),
                end: this.formatDate(yesterday),
                type: 'day'
            };
        }

        return null;
    }

    /**
     * Parse month names: "January", "Jan", "December 2024"
     */
    private static parseMonthName(query: string): DateRange | null {
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const monthShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

        let monthIndex = -1;
        let year = new Date().getFullYear();

        // Find month
        for (let i = 0; i < monthNames.length; i++) {
            if (query.includes(monthNames[i]) || query.includes(monthShort[i])) {
                monthIndex = i;
                break;
            }
        }

        if (monthIndex === -1) return null;

        // Extract year if present
        const yearMatch = query.match(/\b(20\d{2})\b/);
        if (yearMatch) {
            year = parseInt(yearMatch[1]);
        }

        const firstDay = new Date(year, monthIndex, 1);
        const lastDay = new Date(year, monthIndex + 1, 0);

        return {
            start: this.formatDate(firstDay),
            end: this.formatDate(lastDay),
            type: 'month'
        };
    }

    /**
     * Parse specific dates: "15th", "Jan 15", "15/01/2025"
     */
    private static parseSpecificDate(query: string): DateRange | null {
        const now = new Date();

        // DD/MM/YYYY or DD-MM-YYYY
        const datePattern1 = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
        const match1 = query.match(datePattern1);
        if (match1) {
            const day = parseInt(match1[1]);
            const month = parseInt(match1[2]) - 1;
            const year = parseInt(match1[3]);
            const date = new Date(year, month, day);
            return {
                start: this.formatDate(date),
                end: this.formatDate(date),
                type: 'day'
            };
        }

        // "15th" or "15"
        const dayPattern = /\b(\d{1,2})(?:st|nd|rd|th)?\b/;
        const dayMatch = query.match(dayPattern);
        if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            if (day >= 1 && day <= 31) {
                const date = new Date(now.getFullYear(), now.getMonth(), day);
                return {
                    start: this.formatDate(date),
                    end: this.formatDate(date),
                    type: 'day'
                };
            }
        }

        return null;
    }

    /**
     * Parse year: "2024", "last year", "this year"
     */
    private static parseYear(query: string): DateRange | null {
        const now = new Date();
        let year = now.getFullYear();

        if (query.includes('last year') || query.includes('previous year')) {
            year = now.getFullYear() - 1;
        } else if (query.includes('this year') || query.includes('current year')) {
            year = now.getFullYear();
        } else {
            const yearMatch = query.match(/\b(20\d{2})\b/);
            if (yearMatch) {
                year = parseInt(yearMatch[1]);
            } else {
                return null;
            }
        }

        const firstDay = new Date(year, 0, 1);
        const lastDay = new Date(year, 11, 31);

        return {
            start: this.formatDate(firstDay),
            end: this.formatDate(lastDay),
            type: 'year'
        };
    }

    /**
     * Parse week references
     */
    private static parseWeek(query: string): DateRange | null {
        // Already handled in parseRelativeDate
        return null;
    }

    /**
     * Format date to DD/MM/YYYY
     */
    private static formatDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Parse date string DD/MM/YYYY to Date object
     */
    static parseDate(dateStr: string): Date {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    }

    /**
     * Check if a date is within a range
     */
    static isDateInRange(date: string, range: DateRange): boolean {
        const checkDate = this.parseDate(date);
        const startDate = this.parseDate(range.start);
        const endDate = this.parseDate(range.end);

        return checkDate >= startDate && checkDate <= endDate;
    }
}
