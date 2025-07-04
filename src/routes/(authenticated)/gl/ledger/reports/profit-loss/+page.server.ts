import type { PageServerLoad } from './$types';
import { getRevenueExpenseAccounts } from '$lib/utils/utils.server';
import { fiscalPeriod } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const { db } = event.locals;
	const searchParams = event.url.searchParams;
	const periodId = searchParams.get('periodId');

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

	// Build date range for the selected period
	const lastDay = new Date(selectedPeriod.year, selectedPeriod.month, 0).getDate();
	const startDate = `${selectedPeriod.year}-${selectedPeriod.month.toString().padStart(2, '0')}-01`;
	const endDate = `${selectedPeriod.year}-${selectedPeriod.month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

	const showPercentages = searchParams.get('showPercentages') === 'true';

	const filters = {
		dateRange: { start: startDate, end: endDate },
		showPercentages
	};

	try {
		const {
			revenues,
			expenses,
			pendapatan,
			biayaOperasional,
			biayaOperasionalLainnya,
			biayaAdministrasiUmum,
			pendapatanBiayaLainLain
		} = await getRevenueExpenseAccounts(event, filters);

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

		return {
			periods,
			selectedPeriod,
			revenues: revenues || [],
			expenses: expenses || [],
			pendapatan: pendapatan || [],
			biayaOperasional: biayaOperasional || [],
			biayaOperasionalLainnya: biayaOperasionalLainnya || [],
			biayaAdministrasiUmum: biayaAdministrasiUmum || [],
			pendapatanBiayaLainLain: pendapatanBiayaLainLain || [],
			revenueTotals,
			expenseTotals,
			netIncome
		};
	} catch (error) {
		console.error('Error loading profit and loss data:', error);
		return {
			periods,
			selectedPeriod,
			revenues: [],
			expenses: [],
			pendapatan: [],
			biayaOperasional: [],
			biayaOperasionalLainnya: [],
			biayaAdministrasiUmum: [],
			pendapatanBiayaLainLain: [],
			revenueTotals: { debit: 0, credit: 0, balance: 0 },
			expenseTotals: { debit: 0, credit: 0, balance: 0 },
			netIncome: 0
		};
	}
};
