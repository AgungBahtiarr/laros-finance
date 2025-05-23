import type { RequestEvent } from '@sveltejs/kit';

export interface ReportFilters {
	dateRange: {
		start: Date;
		end: Date;
	};
	accountIds?: string[];
	includeSubAccounts?: boolean;
	compareWithPrevious?: boolean;
	showPercentages?: boolean;
}

export interface AccountBalance {
	id: string;
	code: string;
	name: string;
	type: string;
	debit: number;
	credit: number;
	balance: number;
	level: number;
}

export interface JournalEntry {
	id: string;
	date: string;
	description: string;
	reference: string;
	debit: number;
	credit: number;
	accountId: string;
	accountName: string;
}

export async function getAccountBalances(
	event: RequestEvent,
	filters: ReportFilters
): Promise<AccountBalance[]> {
	// TODO: Implement actual database query
	return [];
}

export async function getJournalEntries(
	event: RequestEvent,
	filters: ReportFilters
): Promise<JournalEntry[]> {
	// TODO: Implement actual database query
	return [];
}

export function calculateAccountTotals(accounts: AccountBalance[]) {
	return accounts.reduce(
		(totals, account) => {
			totals.debit += account.debit;
			totals.credit += account.credit;
			totals.balance += account.balance;
			return totals;
		},
		{ debit: 0, credit: 0, balance: 0 }
	);
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function calculatePercentage(value: number, total: number): string {
	if (total === 0) return '0%';
	return ((value / total) * 100).toFixed(1) + '%';
}
