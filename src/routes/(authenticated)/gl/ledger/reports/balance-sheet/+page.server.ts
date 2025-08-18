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
	const aktivaLancar: AccountBalance[] = [];
	const aktivaTetap: AccountBalance[] = [];
	const akumulasiPenyusutan: AccountBalance[] = [];
	const aktivaLainnya: AccountBalance[] = [];

	assets.forEach((acc) => {
		// Prioritize groupName for categorization
		switch (acc.groupName) {
			case 'Aktiva Lancar':
				aktivaLancar.push(acc);
				break;
			case 'Aktiva Tetap':
				aktivaTetap.push(acc);
				break;
			case 'Akumulasi Penyusutan':
				akumulasiPenyusutan.push(acc);
				break;
			case 'Aktiva Lain-Lain':
				aktivaLainnya.push(acc);
				break;
			default:
				// Fallback for accounts without a groupName or with an unexpected one.
				const name = acc.name.toLowerCase();
				if (
					name.includes('kas') ||
					name.includes('bank') ||
					name.includes('piutang') ||
					name.includes('persediaan')
				) {
					aktivaLancar.push(acc);
				} else if (
					name.includes('tanah') ||
					name.includes('bangunan') ||
					name.includes('kendaraan') ||
					name.includes('peralatan')
				) {
					// Exception for 'Uang Jaminan Kendaraan' which should be in 'Aktiva Lainnya'
					if (name.includes('uang jaminan')) {
						aktivaLainnya.push(acc);
					} else {
						aktivaTetap.push(acc);
					}
				} else {
					aktivaLainnya.push(acc); // Default catch-all
				}
				break;
		}
	});

	// Isolate special accounts from liabilities
	const pendapatanDiterimaDiMuka = liabilities.find(
		(acc) => acc.name.toLowerCase() === 'pendapatan diterima dimuka'
	);
	const otherLiabilities = liabilities.filter(
		(acc) => acc.name.toLowerCase() !== 'pendapatan diterima dimuka'
	);

	// Kategorisasi Pasiva
	const hutangLancar: AccountBalance[] = [];
	const biayaYMHDB: AccountBalance[] = [];
	const pajakYMHDB: AccountBalance[] = [];
	const hutangJangkaPanjang: AccountBalance[] = [];

	otherLiabilities.forEach((acc) => {
		switch (acc.groupName) {
			case 'Hutang Lancar':
				hutangLancar.push(acc);
				break;
			case 'Biaya Yang Masih Harus Dibayar':
				biayaYMHDB.push(acc);
				break;
			case 'Pajak Yang Masih Harus Dibayar':
				pajakYMHDB.push(acc);
				break;
			case 'Hutang Jangka Panjang':
				hutangJangkaPanjang.push(acc);
				break;
			default:
				// Fallback for safety. Some equity accounts might be miscategorized as liabilities upstream.
				// We will ignore them here to prevent duplication, as they are handled correctly in the 'equity' array.
				const name = acc.name.toLowerCase();
				if (
					name.includes('modal') ||
					name.includes('laba') ||
					name.includes('ikhtisar')
				) {
					// Ignore equity-related accounts found in the liabilities list.
				} else {
					// For other unknown liabilities, assume they are current liabilities.
					hutangLancar.push(acc);
				}
				break;
		}
	});

	// Calculate subtotals
	const totalAktivaLancar = {
		balance: aktivaLancar.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalAktivaTetap = {
		balance: aktivaTetap.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalAkumulasiPenyusutan = {
		balance: akumulasiPenyusutan.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalAktivaLainnya = {
		balance: aktivaLainnya.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalHutangLancar = {
		balance: hutangLancar.reduce((sum, acc) => sum + acc.balance, 0)
	};
	const totalBiayaYMHDB = { balance: biayaYMHDB.reduce((sum, acc) => sum + acc.balance, 0) };
	const totalPajakYMHDB = { balance: pajakYMHDB.reduce((sum, acc) => sum + acc.balance, 0) };
	const totalHutangJangkaPanjang = {
		balance: hutangJangkaPanjang.reduce((sum, acc) => sum + acc.balance, 0)
	};

	// Filter out Laba Rugi from equity accounts to prevent double counting
	const modalAccounts = equity.filter((acc) => !acc.name.toLowerCase().includes('laba (rugi) berjalan'));
	const totalModal = {
		balance: modalAccounts.reduce((sum, acc) => sum + acc.balance, 0)
	};

	// Calculate totals
	const allAssets = [...aktivaLancar, ...aktivaTetap, ...akumulasiPenyusutan, ...aktivaLainnya];
	const totalAktiva = {
		debit: allAssets.reduce((sum, acc) => sum + acc.debit, 0),
		credit: allAssets.reduce((sum, acc) => sum + acc.credit, 0),
		balance: allAssets.reduce((sum, acc) => sum + acc.balance, 0)
	};

	const allPasivaAccounts = [
		...hutangLancar,
		...biayaYMHDB,
		...pajakYMHDB,
		...hutangJangkaPanjang,
		...(pendapatanDiterimaDiMuka ? [pendapatanDiterimaDiMuka] : []),
		...modalAccounts
	];
	const totalPasiva = {
		debit: allPasivaAccounts.reduce((sum, acc) => sum + acc.debit, 0),
		credit: allPasivaAccounts.reduce((sum, acc) => sum + acc.credit, 0),
		balance: allPasivaAccounts.reduce((sum, acc) => sum + acc.balance, 0) + netIncome
	};

	return {
		aktivaLancar,
		totalAktivaLancar,
		aktivaTetap,
		totalAktivaTetap,
		akumulasiPenyusutan,
		totalAkumulasiPenyusutan,
		aktivaLainnya,
		totalAktivaLainnya,
		totalAktiva,
		hutangLancar,
		totalHutangLancar,
		biayaYMHDB,
		totalBiayaYMHDB,
		pajakYMHDB,
		totalPajakYMHDB,
		hutangJangkaPanjang,
		totalHutangJangkaPanjang,
		modal: modalAccounts,
		totalModal,
		pendapatanDiterimaDiMuka,
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