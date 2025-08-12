import type { PageServerLoad } from './$types';
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm';
import {
	fiscalPeriod,
	journalEntry,
	journalEntryLine,
	chartOfAccount,
	accountGroup,
	accountType
} from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	const { db } = event.locals;
	const searchParams = event.url.searchParams;
	const periodId = searchParams.get('periodId');
	const journalType = searchParams.get('journalType') || 'all';

	// Get all fiscal periods for dropdown
	const periods = await db.query.fiscalPeriod.findMany({
		orderBy: (fiscalPeriod, { desc }) => [desc(fiscalPeriod.year), desc(fiscalPeriod.month)]
	});

	// If no period selected, use latest period
	const selectedPeriod = periodId
		? await db.query.fiscalPeriod.findFirst({
				where: eq(fiscalPeriod.id, parseInt(periodId))
			})
		: periods[0];

	if (!selectedPeriod) {
		throw new Error('No fiscal period found');
	}

	// Get accounts with their groups and types
	const accounts = await db
		.select({
			id: chartOfAccount.id,
			code: chartOfAccount.code,
			name: chartOfAccount.name,
			level: chartOfAccount.level,
			parentId: chartOfAccount.parentId,
			groupCode: accountGroup.code,
			groupName: accountGroup.name,
			accountType: accountType.code,
			balanceType: accountType.balanceType
		})
		.from(chartOfAccount)
		.innerJoin(accountGroup, eq(chartOfAccount.accountGroupId, accountGroup.id))
		.innerJoin(accountType, eq(accountGroup.accountTypeId, accountType.id))
		.where(eq(chartOfAccount.isActive, true))
		.orderBy(chartOfAccount.code);

	// Check if selected period is January
	const isJanuary = selectedPeriod.month === 1;

	// Calculate balances for each account
	const accountBalances = await Promise.all(
		accounts.map(async (account) => {
			// Previous balance calculation (balance from previous month)
			let previousDebit = 0;
			let previousCredit = 0;

			if (!isJanuary) {
				// Get previous month period
				const prevMonth = selectedPeriod.month - 1;
				const prevYear = selectedPeriod.year;

				const previousPeriod = await db.query.fiscalPeriod.findFirst({
					where: and(eq(fiscalPeriod.month, prevMonth), eq(fiscalPeriod.year, prevYear))
				});

				if (previousPeriod) {
					// Get cumulative balance up to previous month
					const startOfYear = `${selectedPeriod.year}-01-01`;
					const endOfPrevMonth = `${selectedPeriod.year}-${previousPeriod.month.toString().padStart(2, '0')}-${new Date(selectedPeriod.year, previousPeriod.month, 0).getDate().toString().padStart(2, '0')}`;

					// Build where conditions for journal type filter
					const whereConditions = [
						eq(journalEntryLine.accountId, account.id),
						eq(journalEntry.status, 'POSTED'),
						gte(journalEntry.date, startOfYear),
						lte(journalEntry.date, endOfPrevMonth)
					];

					// Add journal type filter
					if (journalType === 'commitment') {
						whereConditions.push(sql`${journalEntry.number} NOT LIKE 'b%'`);
					} else if (journalType === 'breakdown') {
						whereConditions.push(sql`${journalEntry.number} LIKE 'b%'`);
					} else if (journalType === 'net') {
						// Net Transactions: Avoid double counting
						const allJournals = await db
							.select({ number: journalEntry.number })
							.from(journalEntry)
							.where(
								and(
									gte(journalEntry.date, startOfYear),
									lte(journalEntry.date, endOfPrevMonth),
									eq(journalEntry.status, 'POSTED')
								)
							);

						const journalsWithoutDoubleCount: string[] = [];
						for (const journal of allJournals) {
							const number = journal.number;
							if (number.startsWith('b')) {
								journalsWithoutDoubleCount.push(number);
							} else {
								const hasBreakdownPair = allJournals.some((j) => j.number === 'b' + number);
								if (!hasBreakdownPair) {
									journalsWithoutDoubleCount.push(number);
								}
							}
						}

						if (journalsWithoutDoubleCount.length > 0) {
							whereConditions.push(inArray(journalEntry.number, journalsWithoutDoubleCount));
						} else {
							whereConditions.push(sql`1 = 0`);
						}
					}

					const cumulativeBalances = await db
						.select({
							totalDebit: sql<number>`COALESCE(SUM(${journalEntryLine.debitAmount}), 0)`,
							totalCredit: sql<number>`COALESCE(SUM(${journalEntryLine.creditAmount}), 0)`
						})
						.from(journalEntryLine)
						.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
						.where(and(...whereConditions));

					const totalCumulativeDebit = Number(cumulativeBalances[0]?.totalDebit || 0);
					const totalCumulativeCredit = Number(cumulativeBalances[0]?.totalCredit || 0);

					// Calculate cumulative balance up to previous month
					const cumulativeBalance = totalCumulativeDebit - totalCumulativeCredit;

					// Set previous debit/credit based on cumulative balance
					if (cumulativeBalance >= 0) {
						previousDebit = cumulativeBalance;
						previousCredit = 0;
					} else {
						previousDebit = 0;
						previousCredit = Math.abs(cumulativeBalance);
					}
				}
			}

			// Current period movements
			const startOfCurrentMonth = `${selectedPeriod.year}-${selectedPeriod.month.toString().padStart(2, '0')}-01`;
			const endOfCurrentMonth = `${selectedPeriod.year}-${selectedPeriod.month.toString().padStart(2, '0')}-${new Date(selectedPeriod.year, selectedPeriod.month, 0).getDate().toString().padStart(2, '0')}`;

			// Build where conditions for current period with journal type filter
			const currentWhereConditions = [
				eq(journalEntryLine.accountId, account.id),
				eq(journalEntry.status, 'POSTED'),
				gte(journalEntry.date, startOfCurrentMonth),
				lte(journalEntry.date, endOfCurrentMonth)
			];

			// Add journal type filter
			if (journalType === 'commitment') {
				currentWhereConditions.push(sql`${journalEntry.number} NOT LIKE 'b%'`);
			} else if (journalType === 'breakdown') {
				currentWhereConditions.push(sql`${journalEntry.number} LIKE 'b%'`);
			} else if (journalType === 'net') {
				// Net Transactions: Avoid double counting
				const allJournals = await db
					.select({ number: journalEntry.number })
					.from(journalEntry)
					.where(
						and(
							gte(journalEntry.date, startOfCurrentMonth),
							lte(journalEntry.date, endOfCurrentMonth),
							eq(journalEntry.status, 'POSTED')
						)
					);

				const journalsWithoutDoubleCount: string[] = [];
				for (const journal of allJournals) {
					const number = journal.number;
					if (number.startsWith('b')) {
						journalsWithoutDoubleCount.push(number);
					} else {
						const hasBreakdownPair = allJournals.some((j) => j.number === 'b' + number);
						if (!hasBreakdownPair) {
							journalsWithoutDoubleCount.push(number);
						}
					}
				}

				if (journalsWithoutDoubleCount.length > 0) {
					currentWhereConditions.push(inArray(journalEntry.number, journalsWithoutDoubleCount));
				} else {
					currentWhereConditions.push(sql`1 = 0`);
				}
			}

			const currentBalances = await db
				.select({
					totalDebit: sql<number>`COALESCE(SUM(${journalEntryLine.debitAmount}), 0)`,
					totalCredit: sql<number>`COALESCE(SUM(${journalEntryLine.creditAmount}), 0)`
				})
				.from(journalEntryLine)
				.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
				.where(and(...currentWhereConditions));

			const currentDebit = Number(currentBalances[0]?.totalDebit || 0);
			const currentCredit = Number(currentBalances[0]?.totalCredit || 0);

			// Calculate final balance: (prev_debit - prev_credit) + (curr_debit - curr_credit)
			const balance = previousDebit - previousCredit + (currentDebit - currentCredit);

			return {
				id: account.id,
				code: account.code,
				name: account.name,
				type: account.accountType,
				level: account.level,
				parentId: account.parentId,
				groupCode: account.groupCode,
				groupName: account.groupName,
				balanceType: account.balanceType,
				previousDebit: Number(previousDebit.toFixed(2)),
				previousCredit: Number(previousCredit.toFixed(2)),
				currentDebit: Number(currentDebit.toFixed(2)),
				currentCredit: Number(currentCredit.toFixed(2)),
				balance: Number(Math.abs(balance).toFixed(2)),
				isDebit: balance >= 0
			};
		})
	);

	// Calculate totals
	const totals = accountBalances.reduce(
		(acc, curr) => ({
			previousDebit: Number((acc.previousDebit + curr.previousDebit).toFixed(2)),
			previousCredit: Number((acc.previousCredit + curr.previousCredit).toFixed(2)),
			currentDebit: Number((acc.currentDebit + curr.currentDebit).toFixed(2)),
			currentCredit: Number((acc.currentCredit + curr.currentCredit).toFixed(2)),
			balanceDebit: Number((acc.balanceDebit + (curr.isDebit ? curr.balance : 0)).toFixed(2)),
			balanceCredit: Number((acc.balanceCredit + (!curr.isDebit ? curr.balance : 0)).toFixed(2))
		}),
		{
			previousDebit: 0,
			previousCredit: 0,
			currentDebit: 0,
			currentCredit: 0,
			balanceDebit: 0,
			balanceCredit: 0
		}
	);

	return {
		periods,
		selectedPeriod,
		accounts: accountBalances,
		totals,
		filters: {
			periodId,
			journalType
		}
	};
};
