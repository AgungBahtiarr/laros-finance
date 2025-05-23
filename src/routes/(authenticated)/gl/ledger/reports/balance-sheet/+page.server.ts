import type { PageServerLoad } from './$types';
import { getAccountBalances, type AccountBalance } from '../../../../../../lib/utils.server';

interface BalanceSheetData {
	assets: AccountBalance[];
	liabilities: AccountBalance[];
	equity: AccountBalance[];
	assetTotals: {
		debit: number;
		credit: number;
		balance: number;
	};
	liabilityTotals: {
		debit: number;
		credit: number;
		balance: number;
	};
	equityTotals: {
		debit: number;
		credit: number;
		balance: number;
	};
	previousPeriod?: {
		assets: AccountBalance[];
		liabilities: AccountBalance[];
		equity: AccountBalance[];
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
	const accounts = await getAccountBalances(event, filters);
	const assets = accounts.filter((acc) => acc.type === 'ASSET');
	const liabilities = accounts.filter((acc) => acc.type === 'LIABILITY');
	const equity = accounts.filter((acc) => acc.type === 'EQUITY');

	const assetTotals = assets.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			balance: totals.balance + acc.balance
		}),
		{ debit: 0, credit: 0, balance: 0 }
	);

	const liabilityTotals = liabilities.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			balance: totals.balance + acc.balance
		}),
		{ debit: 0, credit: 0, balance: 0 }
	);

	const equityTotals = equity.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			balance: totals.balance + acc.balance
		}),
		{ debit: 0, credit: 0, balance: 0 }
	);

	const data: BalanceSheetData = {
		assets,
		liabilities,
		equity,
		assetTotals,
		liabilityTotals,
		equityTotals
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

		const prevAccounts = await getAccountBalances(event, prevFilters);
		data.previousPeriod = {
			assets: prevAccounts.filter((acc) => acc.type === 'ASSET'),
			liabilities: prevAccounts.filter((acc) => acc.type === 'LIABILITY'),
			equity: prevAccounts.filter((acc) => acc.type === 'EQUITY')
		};
	}

	return data;
};
