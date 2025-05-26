import type { PageServerLoad } from './$types';
import { getRevenueExpenseAccounts, type AccountBalance } from '../utils.server';

interface ProfitLossData {
	revenues: AccountBalance[];
	expenses: AccountBalance[];
	revenueTotals: {
		debit: number;
		credit: number;
		balance: number;
	};
	expenseTotals: {
		debit: number;
		credit: number;
		balance: number;
	};
	netIncome: number;
	previousPeriod?: {
		revenues: AccountBalance[];
		expenses: AccountBalance[];
		netIncome: number;
	};
}

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

	// Get current period data
	const { revenues, expenses } = await getRevenueExpenseAccounts(event, filters);

	const revenueTotals = revenues.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			balance: totals.balance + acc.balance
		}),
		{ debit: 0, credit: 0, balance: 0 }
	);

	const expenseTotals = expenses.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			balance: totals.balance + acc.balance
		}),
		{ debit: 0, credit: 0, balance: 0 }
	);

	const netIncome = revenueTotals.balance - expenseTotals.balance;

	const data: ProfitLossData = {
		revenues,
		expenses,
		revenueTotals,
		expenseTotals,
		netIncome
	};

	// Get previous period data if requested
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

		const { revenues: prevRevenues, expenses: prevExpenses } = await getRevenueExpenseAccounts(event, prevFilters);

		const prevRevenueTotals = prevRevenues.reduce(
			(totals, acc) => ({
				debit: totals.debit + acc.debit,
				credit: totals.credit + acc.credit,
				balance: totals.balance + acc.balance
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		const prevExpenseTotals = prevExpenses.reduce(
			(totals, acc) => ({
				debit: totals.debit + acc.debit,
				credit: totals.credit + acc.credit,
				balance: totals.balance + acc.balance
			}),
			{ debit: 0, credit: 0, balance: 0 }
		);

		data.previousPeriod = {
			revenues: prevRevenues,
			expenses: prevExpenses,
			netIncome: prevRevenueTotals.balance - prevExpenseTotals.balance
		};
	}

	return data;
};
