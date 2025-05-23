import { and, eq, gte, lte, sql } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import {
	accountBalance,
	chartOfAccount,
	accountGroup,
	accountType,
	fiscalPeriod,
	type ChartOfAccount
} from '$lib/server/db/schema';

export interface AccountBalance {
	id: number;
	code: string;
	name: string;
	type: string;
	level: number;
	debit: number;
	credit: number;
	balance: number;
}

interface DateRange {
	start: string;
	end: string;
}

interface ReportFilters {
	dateRange: DateRange;
	showPercentages?: boolean;
}

export async function getAccountBalances(
	event: RequestEvent,
	filters: ReportFilters
): Promise<AccountBalance[]> {
	const { db } = event.locals;
	const { dateRange } = filters;

	// Get the fiscal period for the date range
	const period = await db.query.fiscalPeriod.findFirst({
		where: and(
			lte(fiscalPeriod.startDate, dateRange.start),
			gte(fiscalPeriod.endDate, dateRange.end)
		)
	});

	if (!period) {
		throw new Error('No fiscal period found for the specified date range');
	}

	// Query to get account balances with account details
	const balances = await db
		.select({
			id: chartOfAccount.id,
			code: chartOfAccount.code,
			name: chartOfAccount.name,
			type: accountType.name,
			level: chartOfAccount.level,
			debitMovement: accountBalance.debitMovement,
			creditMovement: accountBalance.creditMovement,
			openingBalance: accountBalance.openingBalance
		})
		.from(chartOfAccount)
		.leftJoin(accountGroup, eq(chartOfAccount.accountGroupId, accountGroup.id))
		.leftJoin(accountType, eq(accountGroup.accountTypeId, accountType.id))
		.leftJoin(
			accountBalance,
			and(
				eq(accountBalance.accountId, chartOfAccount.id),
				eq(accountBalance.fiscalPeriodId, period.id)
			)
		)
		.where(eq(chartOfAccount.isActive, true));

	// Transform the results
	return balances.map((row) => {
		const openingBalance = Number(row.openingBalance || 0);
		const debitMovement = Number(row.debitMovement || 0);
		const creditMovement = Number(row.creditMovement || 0);

		// Calculate final balance based on account type
		const isDebitNormal = row.type === 'ASSET' || row.type === 'EXPENSE';
		const balance = isDebitNormal
			? openingBalance + debitMovement - creditMovement
			: openingBalance - debitMovement + creditMovement;

		return {
			id: row.id,
			code: row.code,
			name: row.name,
			type: row.type,
			level: row.level,
			debit: debitMovement,
			credit: creditMovement,
			balance
		};
	});
}

export async function getRevenueExpenseAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<{
	revenues: AccountBalance[];
	expenses: AccountBalance[];
}> {
	const { db } = event.locals;
	const { dateRange } = filters;

	// Get all account balances
	const balances = await getAccountBalances(event, filters);

	// Split into revenues and expenses
	const revenues = balances.filter((account) => account.type === 'REVENUE');
	const expenses = balances.filter((account) => account.type === 'EXPENSE');

	return {
		revenues,
		expenses
	};
}

export async function getBalanceSheetAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<{
	assets: AccountBalance[];
	liabilities: AccountBalance[];
	equity: AccountBalance[];
}> {
	const { db } = event.locals;
	const { dateRange } = filters;

	// Get all account balances
	const balances = await getAccountBalances(event, filters);

	// Split into balance sheet categories
	const assets = balances.filter((account) => account.type === 'ASSET');
	const liabilities = balances.filter((account) => account.type === 'LIABILITY');
	const equity = balances.filter((account) => account.type === 'EQUITY');

	return {
		assets,
		liabilities,
		equity
	};
}

export async function getTrialBalanceAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<AccountBalance[]> {
	// Get all account balances
	const balances = await getAccountBalances(event, filters);

	// Sort by account code
	return balances.sort((a, b) => a.code.localeCompare(b.code));
}
