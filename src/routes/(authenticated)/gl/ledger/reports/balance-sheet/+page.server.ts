import type { PageServerLoad } from './$types';
import { getBalanceSheetAccounts, getRevenueExpenseAccounts } from '$lib/utils/utils.server';
import type { AccountBalance } from '$lib/utils/types';
import { fiscalPeriod } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface BalanceSheetData {
	// Aktiva (Assets)
	aktivaLancar: AccountBalance[]; // Current Assets
	aktivaTetap: AccountBalance[]; // Fixed Assets
	aktivaLainnya: AccountBalance[]; // Other Assets
	totalAktiva: {
		debit: number;
		credit: number;
		balance: number;
	};

	// Pasiva (Liabilities + Equity)
	hutangLancar: AccountBalance[]; // Current Liabilities
	hutangJangkaPanjang: AccountBalance[]; // Long-term Liabilities
	modal: AccountBalance[]; // Equity
	totalPasiva: {
		debit: number;
		credit: number;
		balance: number;
	};

	periods: any[];
	selectedPeriod: any;
}

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

	// Build date range for the selected period
	const startDate = `${selectedPeriod.year}-01-01`; // Start from the beginning of the year
	const lastDay = new Date(selectedPeriod.year, selectedPeriod.month, 0).getDate();
	const endDate = `${selectedPeriod.year}-${selectedPeriod.month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

	const filters = {
		dateRange: { start: startDate, end: endDate },
		journalType: journalType as 'all' | 'commitment' | 'breakdown' | 'net'
	};

	const { assets, liabilities, equity } = await getBalanceSheetAccounts(event, filters);
	const { revenues, expenses } = await getRevenueExpenseAccounts(event, filters);

	const netIncome =
		revenues.reduce((sum, acc) => sum + acc.balance, 0) +
		expenses.reduce((sum, acc) => sum + acc.balance, 0);

	// Kategorisasi Aktiva
	const aktivaLancar = assets.filter(
		(acc) =>
			acc.groupName === 'Aktiva Lancar' ||
			acc.name.toLowerCase().includes('kas') ||
			acc.name.toLowerCase().includes('bank') ||
			acc.name.toLowerCase().includes('piutang') ||
			acc.name.toLowerCase().includes('persediaan')
	);

	const aktivaTetap = assets.filter(
		(acc) =>
			acc.groupName === 'Aktiva Tetap' ||
			acc.name.toLowerCase().includes('tanah') ||
			acc.name.toLowerCase().includes('bangunan') ||
			acc.name.toLowerCase().includes('kendaraan') ||
			acc.name.toLowerCase().includes('peralatan')
	);

	const aktivaLainnya = assets.filter(
		(acc) =>
			acc.groupName === 'Aktiva Lain-Lain' ||
			(!aktivaLancar.find((a) => a.id === acc.id) && !aktivaTetap.find((a) => a.id === acc.id))
	);

	// Kategorisasi Pasiva
	const hutangLancar = liabilities.filter(
		(acc) =>
			acc.groupName === 'Hutang Lancar' ||
			acc.name.toLowerCase().includes('hutang dagang') ||
			acc.name.toLowerCase().includes('hutang usaha') ||
			acc.name.toLowerCase().includes('hutang pajak')
	);

	const hutangJangkaPanjang = liabilities.filter(
		(acc) => acc.groupName === 'Hutang Jangka Panjang' || !hutangLancar.find((h) => h.id === acc.id)
	);

	// Calculate subtotals
	const totalAktivaLancar = {
		balance: aktivaLancar.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalAktivaTetap = {
		balance: aktivaTetap.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalAktivaLainnya = {
		balance: aktivaLainnya.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalHutangLancar = {
		balance: hutangLancar.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalHutangJangkaPanjang = {
		balance: hutangJangkaPanjang.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalModal = {
		balance: equity.reduce((sum, acc) => sum + acc.balance, 0)
	};

	// Calculate totals
	const totalAktiva = {
		debit: [...aktivaLancar, ...aktivaTetap, ...aktivaLainnya].reduce(
			(sum, acc) => sum + acc.debit,
			0
		),
		credit: [...aktivaLancar, ...aktivaTetap, ...aktivaLainnya].reduce(
			(sum, acc) => sum + acc.credit,
			0
		),
		balance: [...aktivaLancar, ...aktivaTetap, ...aktivaLainnya].reduce(
			(sum, acc) => sum + acc.balance,
			0
		)
	};

	const totalPasiva = {
		debit: [...hutangLancar, ...hutangJangkaPanjang, ...equity].reduce(
			(sum, acc) => sum + acc.debit,
			0
		),
		credit: [...hutangLancar, ...hutangJangkaPanjang, ...equity].reduce(
			(sum, acc) => sum + acc.credit,
			0
		),
		balance:
			[...hutangLancar, ...hutangJangkaPanjang, ...equity].reduce(
				(sum, acc) => sum + acc.balance,
				0
			) + netIncome
	};

	return {
		aktivaLancar,
		totalAktivaLancar,
		aktivaTetap,
		totalAktivaTetap,
		aktivaLainnya,
		totalAktivaLainnya,
		totalAktiva,
		hutangLancar,
		totalHutangLancar,
		hutangJangkaPanjang,
		totalHutangJangkaPanjang,
		modal: equity,
		totalModal,
		totalPasiva,
		netIncome,
		periods,
		selectedPeriod,
		filters: {
			periodId,
			journalType
		}
	};
};
