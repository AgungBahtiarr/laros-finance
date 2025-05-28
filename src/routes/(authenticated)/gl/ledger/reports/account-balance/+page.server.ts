import type { PageServerLoad } from './$types';
import { getAccountBalances } from '$lib/utils/utils.server';

export const load: PageServerLoad = async (event) => {
	const searchParams = event.url.searchParams;
	const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
	const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const showPercentages = searchParams.get('showPercentages') === 'true';

	const filters = {
		dateRange: { start: startDate, end: endDate },
		showPercentages
	};

	// Get current period data
	const accounts = await getAccountBalances(event, filters);

	// Calculate totals
	const totals = accounts.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			balance: totals.balance + acc.balance
		}),
		{ debit: 0, credit: 0, balance: 0 }
	);

	// Get previous period data if requested
	let previousPeriod = undefined;
	const compareWithPrevious = searchParams.get('compareWithPrevious') === 'true';

	if (compareWithPrevious) {
		// Calculate previous period date range
		const startDateObj = new Date(startDate);
		const endDateObj = new Date(endDate);
		const duration = endDateObj.getTime() - startDateObj.getTime();

		const prevStartDate = new Date(startDateObj.getTime() - duration).toISOString().split('T')[0];
		const prevEndDate = new Date(startDateObj.getTime() - 1).toISOString().split('T')[0];

		const prevFilters = {
			dateRange: { start: prevStartDate, end: prevEndDate },
			showPercentages
		};

		const prevAccounts = await getAccountBalances(event, prevFilters);
		const prevTotals = prevAccounts.reduce(
			(totals, acc) => ({
				debit: totals.debit + acc.debit,
				credit: totals.credit + acc.credit,
				balance: totals.balance + acc.balance
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		previousPeriod = {
			accounts: prevAccounts,
			totals: prevTotals
		};
	}

	return {
		accounts,
		totals,
		previousPeriod
	};
};
