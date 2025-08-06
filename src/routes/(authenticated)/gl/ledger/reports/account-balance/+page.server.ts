import type { PageServerLoad } from './$types';
import { getAccountBalances } from '$lib/utils/utils.server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import {
	fiscalPeriod,
	journalEntry,
	journalEntryLine,
	chartOfAccount,
	accountGroup,
	accountType
} from '$lib/server/db/schema';

// Daftar kode akun yang boleh tampil di account-balance
const ALLOWED_ACCOUNT_CODES = [
	'101',
	'10101',
	'10201',
	'10202',
	'10203',
	'10204',
	'103',
	'10301',
	'104',
	'10401',
	'10402',
	'105',
	'10501',
	'106',
	'10601',
	'10602',
	'10603',
	'107',
	'10701',
	'10702',
	'10703',
	'10704',
	'10705',
	'10706',
	'1101',
	'1102',
	'1103',
	'1104',
	'1105',
	'1201',
	'1301',
	'1302',
	'201',
	'20101',
	'20102',
	'202',
	'2021',
	'2101',
	'2106',
	'2107',
	'2108',
	'2201',
	'2202',
	'2203',
	'2204',
	'2205',
	'2206',
	'3001',
	'3002',
	'3003',
	'3004'
];

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

			// Skip retained earnings account (3003) for now - will be calculated later
			if (account.code === '3003') {
				return null; // Mark for later processing
			}

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

	// Filter and remove null values (retained earnings will be calculated separately)
	const filteredAccountBalances = accountBalances.filter(
		(acc) => acc !== null && ALLOWED_ACCOUNT_CODES.includes(acc.code)
	);

	// Calculate totals from all accounts except retained earnings (3003)
	const otherAccountsTotals = filteredAccountBalances
		.filter((acc) => acc.code !== '3003')
		.reduce(
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

	// Calculate retained earnings as balancing figure
	const retainedEarningsAccount = accounts.find((acc) => acc.code === '3003');
	if (retainedEarningsAccount) {
		const previousBalance = otherAccountsTotals.previousDebit - otherAccountsTotals.previousCredit;
		const currentBalance = otherAccountsTotals.currentDebit - otherAccountsTotals.currentCredit;
		const totalBalance = otherAccountsTotals.balanceDebit - otherAccountsTotals.balanceCredit;

		const retainedEarnings = {
			id: retainedEarningsAccount.id,
			code: retainedEarningsAccount.code,
			name: retainedEarningsAccount.name,
			type: retainedEarningsAccount.accountType,
			level: retainedEarningsAccount.level,
			parentId: retainedEarningsAccount.parentId,
			groupCode: retainedEarningsAccount.groupCode,
			groupName: retainedEarningsAccount.groupName,
			balanceType: retainedEarningsAccount.balanceType,
			previousDebit: previousBalance > 0 ? 0 : Number(Math.abs(previousBalance).toFixed(2)),
			previousCredit: previousBalance > 0 ? Number(Math.abs(previousBalance).toFixed(2)) : 0,
			currentDebit: currentBalance > 0 ? 0 : Number(Math.abs(currentBalance).toFixed(2)),
			currentCredit: currentBalance > 0 ? Number(Math.abs(currentBalance).toFixed(2)) : 0,
			balance: Number(Math.abs(totalBalance).toFixed(2)),
			isDebit: totalBalance < 0
		};

		filteredAccountBalances.push(retainedEarnings);
	}

	// Calculate final totals (should now be balanced)
	const totals = filteredAccountBalances.reduce(
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
		accounts: filteredAccountBalances,
		totals,
		filters: {
			periodId,
			journalType
		}
	};
};
