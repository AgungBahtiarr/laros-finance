import type { PageServerLoad } from './$types';
import { getBalanceSheetAccounts } from '../utils.server';
import type { AccountBalance } from '$lib/types';

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

	previousPeriod?: {
		aktivaLancar: AccountBalance[];
		aktivaTetap: AccountBalance[];
		aktivaLainnya: AccountBalance[];
		hutangLancar: AccountBalance[];
		hutangJangkaPanjang: AccountBalance[];
		modal: AccountBalance[];
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
	const { assets, liabilities, equity } = await getBalanceSheetAccounts(event, filters);

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
		balance: [...hutangLancar, ...hutangJangkaPanjang, ...equity].reduce(
			(sum, acc) => sum + acc.balance,
			0
		)
	};

	const data: BalanceSheetData = {
		aktivaLancar,
		aktivaTetap,
		aktivaLainnya,
		totalAktiva,
		hutangLancar,
		hutangJangkaPanjang,
		modal: equity,
		totalPasiva
	};

	// Get previous period data if requested
	if (compareWithPrevious) {
		const startDateObj = new Date(startDate);
		const endDateObj = new Date(endDate);
		const duration = endDateObj.getTime() - startDateObj.getTime();

		const prevStartDate = new Date(startDateObj.getTime() - duration).toISOString().split('T')[0];
		const prevEndDate = new Date(startDateObj.getTime() - 1).toISOString().split('T')[0];

		const prevFilters = {
			dateRange: { start: prevStartDate, end: prevEndDate },
			showPercentages
		};

		const prevData = await getBalanceSheetAccounts(event, prevFilters);

		// Kategorisasi data periode sebelumnya
		const prevAktivaLancar = prevData.assets.filter(
			(acc) =>
				acc.groupName === 'Aktiva Lancar' ||
				acc.name.toLowerCase().includes('kas') ||
				acc.name.toLowerCase().includes('bank') ||
				acc.name.toLowerCase().includes('piutang') ||
				acc.name.toLowerCase().includes('persediaan')
		);

		const prevAktivaTetap = prevData.assets.filter(
			(acc) =>
				acc.groupName === 'Aktiva Tetap' ||
				acc.name.toLowerCase().includes('tanah') ||
				acc.name.toLowerCase().includes('bangunan') ||
				acc.name.toLowerCase().includes('kendaraan') ||
				acc.name.toLowerCase().includes('peralatan')
		);

		const prevAktivaLainnya = prevData.assets.filter(
			(acc) =>
				acc.groupName === 'Aktiva Lain-Lain' ||
				(!prevAktivaLancar.find((a) => a.id === acc.id) &&
					!prevAktivaTetap.find((a) => a.id === acc.id))
		);

		const prevHutangLancar = prevData.liabilities.filter(
			(acc) =>
				acc.groupName === 'Hutang Lancar' ||
				acc.name.toLowerCase().includes('hutang dagang') ||
				acc.name.toLowerCase().includes('hutang usaha') ||
				acc.name.toLowerCase().includes('hutang pajak')
		);

		const prevHutangJangkaPanjang = prevData.liabilities.filter(
			(acc) =>
				acc.groupName === 'Hutang Jangka Panjang' || !prevHutangLancar.find((h) => h.id === acc.id)
		);

		data.previousPeriod = {
			aktivaLancar: prevAktivaLancar,
			aktivaTetap: prevAktivaTetap,
			aktivaLainnya: prevAktivaLainnya,
			hutangLancar: prevHutangLancar,
			hutangJangkaPanjang: prevHutangJangkaPanjang,
			modal: prevData.equity
		};
	}

	return data;
};
