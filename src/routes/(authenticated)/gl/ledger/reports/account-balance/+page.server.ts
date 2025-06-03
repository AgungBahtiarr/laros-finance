import type { PageServerLoad } from './$types';
import { getAccountBalances } from '$lib/utils/utils.server';

// Account codes that should be included in account balance report
const ACCOUNT_BALANCE_CODES = [
	// Kas & Bank
	/^101\d+/, // Kas
	/^102\d+/, // Bank

	// Piutang
	/^103\d+/, // Piutang
	/^104\d+/, // Piutang Lain

	// Persediaan
	/^105\d+/, // Persediaan

	// Biaya Dibayar Dimuka
	/^106\d+/, // Asuransi Dibayar Dimuka
	/^107\d+/, // Pajak Dibayar Dimuka

	// Aset Tetap
	/^110\d+/, // Tanah
	/^111\d+/, // Bangunan
	/^112\d+/, // Mesin & Peralatan
	/^113\d+/, // Inventaris
	/^114\d+/, // Kendaraan
	/^115\d+/, // Sarana & Prasarana

	// Akumulasi Penyusutan
	/^120\d+/, // Akumulasi Penyusutan

	// Uang Jaminan
	/^130\d+/, // Uang Jaminan

	// Hutang
	/^201\d+/, // Hutang Usaha
	/^202\d+/, // Hutang Lainnya
    /^210(?![2-5])\d+/,
	/^211\d+/, // Hutang Gaji
	/^212\d+/, // Hutang BPJS

	// Hutang Pajak
	/^220\d+/, // Hutang Pajak

	// Modal & Laba
	/^300\d+/ // Modal & Laba
];

export const load: PageServerLoad = async (event) => {
	const searchParams = event.url.searchParams;
	const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
	const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

	// Get the first day of the month for startDate
	const startDateObj = new Date(startDate);
	const firstDayOfMonth = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
	const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

	// Get previous month's data (opening balance)
	const prevMonthEnd = new Date(firstDayOfMonth);
	prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);
	const prevMonthStart = new Date(prevMonthEnd);
	prevMonthStart.setDate(1);

	const prevMonthBalances = await getAccountBalances(event, {
		dateRange: {
			start: prevMonthStart.toISOString().split('T')[0],
			end: prevMonthEnd.toISOString().split('T')[0]
		}
	});

	// Get current period movements
	const currentPeriodMovements = await getAccountBalances(event, {
		dateRange: {
			start: firstDayStr,
			end: endDate
		}
	});

	// Filter accounts that should be included in account balance
	const filterAccountByCode = (account) =>
		ACCOUNT_BALANCE_CODES.some((pattern) => pattern.test(account.code));

	const filteredPrevBalances = prevMonthBalances.filter(filterAccountByCode);
	const filteredCurrentMovements = currentPeriodMovements.filter(filterAccountByCode);

	// Calculate final balances
	const accounts = filteredPrevBalances.map((prevAccount) => {
		const currentAccount = filteredCurrentMovements.find((a) => a.code === prevAccount.code) || {
			debit: 0,
			credit: 0
		};

		const prevBalance = prevAccount.debit - prevAccount.credit;
		const currentBalance = currentAccount.debit - currentAccount.credit;
		const finalBalance = prevBalance - currentBalance;

		return {
			...prevAccount,
			debitMovement: currentAccount.debit,
			creditMovement: currentAccount.credit,
			finalDebit: finalBalance > 0 ? Math.abs(finalBalance) : 0,
			finalCredit: finalBalance < 0 ? Math.abs(finalBalance) : 0
		};
	});

	// Add any new accounts that only exist in current period
	const newAccounts = filteredCurrentMovements
		.filter((curr) => !filteredPrevBalances.find((prev) => prev.code === curr.code))
		.map((account) => {
			const balance = account.debit - account.credit;
			return {
				...account,
				debitMovement: account.debit,
				creditMovement: account.credit,
				finalDebit: balance > 0 ? Math.abs(balance) : 0,
				finalCredit: balance < 0 ? Math.abs(balance) : 0,
				debit: 0,
				credit: 0
			};
		});

	accounts.push(...newAccounts);

	// Calculate totals
	const totals = accounts.reduce(
		(totals, acc) => ({
			debit: totals.debit + acc.debit,
			credit: totals.credit + acc.credit,
			debitMovement: totals.debitMovement + acc.debitMovement,
			creditMovement: totals.creditMovement + acc.creditMovement,
			finalDebit: totals.finalDebit + acc.finalDebit,
			finalCredit: totals.finalCredit + acc.finalCredit
		}),
		{ debit: 0, credit: 0, debitMovement: 0, creditMovement: 0, finalDebit: 0, finalCredit: 0 }
	);

	return {
		accounts,
		totals
	};
};
