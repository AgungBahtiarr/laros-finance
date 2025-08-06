import { and, eq, gte, lte, sql, sum, desc, asc } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import {
	chartOfAccount,
	accountGroup,
	accountType,
	journalEntry,
	journalEntryLine,
	fiscalPeriod
} from '$lib/server/db/schema';
import type { ReportFilters, AccountBalance } from './types';

export async function getAccountBalances(
	event: RequestEvent,
	filters: ReportFilters
): Promise<AccountBalance[]> {
	const { db } = event.locals;
	const { dateRange, journalType } = filters;

	// Get all active accounts with their details
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
		.orderBy(asc(chartOfAccount.code));

	// Build where conditions for journal entries
	const whereConditions = [
		gte(journalEntry.date, dateRange.start),
		lte(journalEntry.date, dateRange.end),
		eq(journalEntry.status, 'POSTED')
	];

	// Add journal type filter
	if (journalType === 'commitment') {
		whereConditions.push(sql`${journalEntry.number} NOT LIKE 'b%'`);
	} else if (journalType === 'breakdown') {
		whereConditions.push(sql`${journalEntry.number} LIKE 'b%'`);
	}
	// For 'all', no additional filter needed

	// Get account balances from journal entries within the date range
	const balances = await db
		.select({
			accountId: journalEntryLine.accountId,
			totalDebit: sum(journalEntryLine.debitAmount),
			totalCredit: sum(journalEntryLine.creditAmount)
		})
		.from(journalEntryLine)
		.innerJoin(journalEntry, eq(journalEntryLine.journalEntryId, journalEntry.id))
		.where(and(...whereConditions))
		.groupBy(journalEntryLine.accountId);

	// Create a map for easy lookup
	const balanceMap = new Map();
	balances.forEach((balance) => {
		balanceMap.set(balance.accountId, {
			debit: Number(balance.totalDebit || 0),
			credit: Number(balance.totalCredit || 0)
		});
	});

	// Transform accounts with balances
	const result = accounts.map((account) => {
		const accountBalance = balanceMap.get(account.id) || { debit: 0, credit: 0 };

		// Calculate net balance based on account type
		// Revenue and Liability accounts have credit normal balance
		// Asset and Expense accounts have debit normal balance
		let balance = 0;
		if (account.balanceType === 'CREDIT') {
			// Credit normal accounts (Revenue, Liability, Equity)
			balance = accountBalance.credit - accountBalance.debit;
		} else {
			// Debit normal accounts (Asset, Expense)
			balance = accountBalance.debit - accountBalance.credit;
		}

		return {
			id: account.id,
			code: account.code,
			name: account.name,
			type: account.accountType,
			level: account.level,
			debit: accountBalance.debit,
			credit: accountBalance.credit,
			balance,
			groupCode: account.groupCode,
			groupName: account.groupName,
			parentId: account.parentId
		};
	});

	return result;
}

export async function getRevenueExpenseAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<{
	revenues: AccountBalance[];
	expenses: AccountBalance[];
	pendapatan: AccountBalance[];
	biayaOperasional: AccountBalance[];
	biayaOperasionalLainnya: AccountBalance[];
	biayaAdministrasiUmum: AccountBalance[];
	pendapatanBiayaLainLain: AccountBalance[];
}> {
	const balances = await getAccountBalances(event, filters);

	const revenues = balances.filter(
		(account) =>
			account.groupName === 'Pendapatan' ||
			account.groupName === '(Pendapatan) Biaya Lain-Lain' ||
			account.code.startsWith('4')
	);

	const expenses = balances.filter(
		(account) =>
			account.groupName === 'Harga Pokok (COGS/HPP)' ||
			account.groupName === 'Biaya Operasional' ||
			account.groupName === 'Biaya Operasional Lainnya' ||
			account.groupName === 'Biaya Administrasi & Umum' ||
			account.code.startsWith('5') ||
			account.code.startsWith('6') ||
			account.code.startsWith('7')
	);

	const pendapatan = balances
		.filter((account) => account.groupName === 'Pendapatan')
		.sort((a, b) => a.code.localeCompare(b.code));

	const biayaOperasional = balances
		.filter((account) => account.groupName === 'Biaya Operasional')
		.sort((a, b) => a.code.localeCompare(b.code));

	const biayaOperasionalLainnya = balances
		.filter((account) => account.groupName === 'Biaya Operasional Lainnya')
		.sort((a, b) => a.code.localeCompare(b.code));

	const biayaAdministrasiUmum = balances
		.filter((account) => account.groupName === 'Biaya Administrasi & Umum')
		.sort((a, b) => a.code.localeCompare(b.code));

	const pendapatanBiayaLainLain = balances
		.filter((account) => account.groupName === '(Pendapatan) Biaya Lain-Lain')
		.sort((a, b) => a.code.localeCompare(b.code));

	return {
		revenues,
		expenses,
		pendapatan,
		biayaOperasional,
		biayaOperasionalLainnya,
		biayaAdministrasiUmum,
		pendapatanBiayaLainLain
	};
}

export async function getBalanceSheetAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<{
	assets: AccountBalance[];
	liabilities: AccountBalance[];
	equity: AccountBalance[];
}> {
	const balances = await getAccountBalances(event, filters);

	// Split into balance sheet categories based on your existing groups
	const assets = balances
		.filter(
			(account) =>
				account.groupName === 'Aktiva Lancar' ||
				account.groupName === 'Aktiva Tetap' ||
				account.groupName === 'Akumulasi Penyusutan' ||
				account.groupName === 'Aktiva Lain-Lain' ||
				account.type === 'ASSET'
		)
		.sort((a, b) => a.code.localeCompare(b.code));

	const liabilities = balances
		.filter(
			(account) =>
				account.groupName === 'Hutang Lancar' ||
				account.groupName === 'Hutang Jangka Panjang' ||
				account.groupName === 'Biaya Yang Masih Harus Dibayar' ||
				account.groupName === 'Pajak Yang Masih Harus Dibayar' ||
				account.groupName === 'Pendapatan dibayar dimuka' ||
				account.type === 'LIABILITY'
		)
		.sort((a, b) => a.code.localeCompare(b.code));

	const equity = balances
		.filter(
			(account) =>
				account.groupName === 'Modal' ||
				account.groupName === 'Laba (Rugi) Tahun Berjalan' ||
				account.type === 'EQUITY'
		)
		.sort((a, b) => a.code.localeCompare(b.code));

	return {
		assets,
		liabilities,
		equity
	};
}

export async function getTrialBalanceAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<AccountBalance[]> {
	const balances = await getAccountBalances(event, filters);

	// Return all accounts sorted by code
	return balances.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getCashFlowAccounts(
	event: RequestEvent,
	filters: ReportFilters
): Promise<{
	operatingActivities: AccountBalance[];
	investingActivities: AccountBalance[];
	financingActivities: AccountBalance[];
}> {
	const balances = await getAccountBalances(event, filters);

	// Operating activities - revenue and expense accounts
	const operatingActivities = balances.filter(
		(account) =>
			account.groupName === 'Pendapatan' ||
			account.groupName === 'Harga Pokok (COGS/HPP)' ||
			account.groupName === 'Biaya Operasional' ||
			account.groupName === 'Biaya Operasional Lainnya' ||
			account.groupName === 'Biaya Administrasi & Umum' ||
			account.name.toLowerCase().includes('operasional')
	);

	// Investing activities - fixed assets and investments
	const investingActivities = balances.filter(
		(account) =>
			account.groupName === 'Aktiva Tetap' ||
			account.groupName === 'Akumulasi Penyusutan' ||
			account.groupName === 'Aktiva Lain-Lain' ||
			account.name.toLowerCase().includes('investasi') ||
			account.name.toLowerCase().includes('aset tetap') ||
			account.name.toLowerCase().includes('fixed asset')
	);

	// Financing activities - equity and long-term debt
	const financingActivities = balances.filter(
		(account) =>
			account.groupName === 'Modal' ||
			account.groupName === 'Hutang Jangka Panjang' ||
			account.groupName === 'Laba (Rugi) Tahun Berjalan' ||
			(account.type === 'LIABILITY' &&
				(account.name.toLowerCase().includes('hutang jangka panjang') ||
					account.name.toLowerCase().includes('long term') ||
					account.name.toLowerCase().includes('kredit')))
	);

	return {
		operatingActivities,
		investingActivities,
		financingActivities
	};
}
