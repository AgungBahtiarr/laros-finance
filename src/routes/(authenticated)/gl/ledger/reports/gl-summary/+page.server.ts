import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { chartOfAccount, accountBalance, fiscalPeriod } from '$lib/server/db/schema';

const PAGE_SIZE = 25; // Reduced page size to lower memory usage

export const load: PageServerLoad = async (event) => {
	try {
		const { db } = event.locals;
		const searchParams = event.url.searchParams;
		const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
		const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
		const selectedAccounts = searchParams.get('accounts')?.split(',').map(Number) || [];
		const page = Number(searchParams.get('page')) || 1;

		// Get the fiscal period first to fail fast if not found
		const period = await db.query.fiscalPeriod.findFirst({
			where: and(
				lte(fiscalPeriod.startDate, startDate),
				gte(fiscalPeriod.endDate, endDate)
			)
		});

		if (!period) {
			throw new Error('No fiscal period found for the specified date range');
		}

		// Get active accounts for the filter - limit to essential fields
		const accounts = await db
			.select({
				id: chartOfAccount.id,
				code: chartOfAccount.code,
				name: chartOfAccount.name
			})
			.from(chartOfAccount)
			.where(eq(chartOfAccount.isActive, true))
			.orderBy(chartOfAccount.code);

		// Build account filter
		const accountFilter = selectedAccounts.length > 0 
			? inArray(accountBalance.accountId, selectedAccounts)
			: undefined;

		// Calculate offset for pagination
		const offset = (page - 1) * PAGE_SIZE;

		// Get total count first to avoid unnecessary data fetch if no results
		const totalCountResult = await db
			.select({
				count: sql<number>`count(*)`.as('count')
			})
			.from(accountBalance)
			.where(
				and(
					eq(accountBalance.fiscalPeriodId, period.id),
					accountFilter || undefined
				)
			);

		const totalCount = Number(totalCountResult[0]?.count || 0);
		
		if (totalCount === 0) {
			return {
				accounts,
				summaryData: [],
				totals: {
					beginningBalance: 0,
					changeDebit: 0,
					changeCredit: 0,
					netChange: 0,
					endingBalance: 0
				},
				selectedAccounts,
				pagination: {
					currentPage: 1,
					totalPages: 0,
					totalItems: 0,
					pageSize: PAGE_SIZE
				}
			};
		}

		// Get paginated account balances
		const balances = await db
			.select({
				accountId: accountBalance.accountId,
				account: {
					id: chartOfAccount.id,
					code: chartOfAccount.code,
					name: chartOfAccount.name
				},
				openingBalance: accountBalance.openingBalance,
				debitMovement: accountBalance.debitMovement,
				creditMovement: accountBalance.creditMovement,
				closingBalance: accountBalance.closingBalance
			})
			.from(accountBalance)
			.leftJoin(chartOfAccount, eq(accountBalance.accountId, chartOfAccount.id))
			.where(
				and(
					eq(accountBalance.fiscalPeriodId, period.id),
					accountFilter || undefined
				)
			)
			.orderBy(chartOfAccount.code)
			.limit(PAGE_SIZE)
			.offset(offset);

		// Transform the data
		const summaryData = balances.map((balance) => ({
			accountId: balance.accountId,
			accountCode: balance.account.code,
			accountName: balance.account.name,
			beginningBalance: Number(balance.openingBalance) || 0,
			changeDebit: Number(balance.debitMovement) || 0,
			changeCredit: Number(balance.creditMovement) || 0,
			netChange: (Number(balance.debitMovement) || 0) - (Number(balance.creditMovement) || 0),
			endingBalance: Number(balance.closingBalance) || 0
		}));

		// Calculate totals for the current page
		const totals = summaryData.reduce(
			(acc, row) => ({
				beginningBalance: acc.beginningBalance + row.beginningBalance,
				changeDebit: acc.changeDebit + row.changeDebit,
				changeCredit: acc.changeCredit + row.changeCredit,
				netChange: acc.netChange + row.netChange,
				endingBalance: acc.endingBalance + row.endingBalance
			}),
			{
				beginningBalance: 0,
				changeDebit: 0,
				changeCredit: 0,
				netChange: 0,
				endingBalance: 0
			}
		);

		return {
			accounts,
			summaryData,
			totals,
			selectedAccounts,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalCount / PAGE_SIZE),
				totalItems: totalCount,
				pageSize: PAGE_SIZE
			}
		};
	} catch (error) {
		console.error('Error in GL Summary load:', error);
		throw error;
	}
}; 