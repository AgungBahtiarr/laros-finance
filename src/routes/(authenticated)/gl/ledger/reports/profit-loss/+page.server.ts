import type { PageServerLoad } from './$types';
import { getRevenueExpenseAccounts } from '../utils.server';

export const load: PageServerLoad = async (event) => {
	const searchParams = event.url.searchParams;
	const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
	const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
	const compareWithPrevious = searchParams.get('compareWithPrevious') === 'true';
	const showPercentages = searchParams.get('showPercentages') === 'true';

	const filters = {
		dateRange: { start: startDate, end: endDate },
		showPercentages
	};

	try {
		// Get current period data
		const { revenues, expenses } = await getRevenueExpenseAccounts(event, filters);

		const revenueTotals = revenues.reduce(
			(totals, acc) => ({
				debit: totals.debit + (acc.debit || 0),
				credit: totals.credit + (acc.credit || 0),
				balance: totals.balance + (acc.balance || 0)
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		const expenseTotals = expenses.reduce(
			(totals, acc) => ({
				debit: totals.debit + (acc.debit || 0),
				credit: totals.credit + (acc.credit || 0),
				balance: totals.balance + (acc.balance || 0)
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		const netIncome = revenueTotals.balance + expenseTotals.balance;

		const data = {
			revenues: revenues || [],
			expenses: expenses || [],
			revenueTotals,
			expenseTotals,
			netIncome
		};

		// Get previous period data if requested
		if (compareWithPrevious) {
			try {
				// Calculate previous period date range
				const startDateObj = new Date(startDate);
				const endDateObj = new Date(endDate);
				const duration = endDateObj.getTime() - startDateObj.getTime();

				const prevStartDate = new Date(startDateObj.getTime() - duration)
					.toISOString()
					.split('T')[0];
				const prevEndDate = new Date(startDateObj.getTime() - 1).toISOString().split('T')[0];

				const prevFilters = {
					dateRange: { start: prevStartDate, end: prevEndDate },
					showPercentages
				};

				const { revenues: prevRevenues, expenses: prevExpenses } = await getRevenueExpenseAccounts(
					event,
					prevFilters
				);

				const prevRevenueTotals = (prevRevenues || []).reduce(
					(totals, acc) => ({
						debit: totals.debit + (acc.debit || 0),
						credit: totals.credit + (acc.credit || 0),
						balance: totals.balance + (acc.balance || 0)
					}),
					{ debit: 0, credit: 0, balance: 0 }
				);

				const prevExpenseTotals = (prevExpenses || []).reduce(
					(totals, acc) => ({
						debit: totals.debit + (acc.debit || 0),
						credit: totals.credit + (acc.credit || 0),
						balance: totals.balance + (acc.balance || 0)
					}),
					{ debit: 0, credit: 0, balance: 0 }
				);

				data.previousPeriod = {
					revenues: prevRevenues || [],
					expenses: prevExpenses || [],
					netIncome: prevRevenueTotals.balance - prevExpenseTotals.balance
				};
			} catch (prevError) {
				console.error('Error fetching previous period data:', prevError);
				// Continue without previous period data
			}
		}

		return data;
	} catch (error) {
		console.error('Error loading profit and loss data:', error);
		// Return empty data structure to prevent page crash
		return {
			revenues: [],
			expenses: [],
			revenueTotals: { debit: 0, credit: 0, balance: 0 },
			expenseTotals: { debit: 0, credit: 0, balance: 0 },
			netIncome: 0
		};
	}
};
