<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { formatCurrencyWithParentheses } from '$lib/utils/utils.client';
	import {
		exportAccountBalanceToPdf,
		exportAccountBalanceToExcel
	} from '$lib/utils/exports/accountBalanceExport';

	interface AccountBalance {
		id: number;
		code: string;
		name: string;
		type: string;
		level: number;
		parentId?: number;
		groupCode?: string;
		groupName?: string;
		balanceType?: string;
		previousDebit: number;
		previousCredit: number;
		currentDebit: number;
		currentCredit: number;
		balance: number;
		isDebit: boolean;
	}

	interface AccountBalanceTotals {
		previousDebit: number;
		previousCredit: number;
		currentDebit: number;
		currentCredit: number;
		balanceDebit: number;
		balanceCredit: number;
	}

	interface AccountBalanceData {
		periods: Array<{ id: number; name: string; month: number; year: number }>;
		selectedPeriod: { id: number; name: string; month: number; year: number };
		accounts: AccountBalance[];
		totals: AccountBalanceTotals;
		filters?: {
			periodId: string | null;
			journalType: string;
		};
	}

	let { data } = $props<{ data: AccountBalanceData }>();

	let selectedPeriodId = $state(data.selectedPeriod?.id);
	let journalType = $state(data.filters?.journalType || 'all');

	if (browser) {
		const searchParams = new URLSearchParams(window.location.search);
		selectedPeriodId = parseInt(searchParams.get('periodId') || data.selectedPeriod?.id);
		journalType = searchParams.get('journalType') || 'all';
	}

	$effect(() => {
		if (browser) {
			const params = new URLSearchParams();
			if (selectedPeriodId) params.set('periodId', selectedPeriodId.toString());
			if (journalType && journalType !== 'all') params.set('journalType', journalType);
			goto(`?${params.toString()}`, { replaceState: true });
		}
	});

	let sortedAccounts = $derived(
		[...data.accounts].sort((a, b) => {
			const typeOrder = {
				ASSET: 1,
				LIABILITY: 2,
				EQUITY: 3,
				REVENUE: 4,
				EXPENSE: 5
			};
			if (typeOrder[a.type] !== typeOrder[b.type]) {
				return typeOrder[a.type] - typeOrder[b.type];
			}
			return a.code.localeCompare(b.code);
		})
	);

	async function handleExport(type: 'pdf' | 'excel') {
		const exportData = {
			accounts: sortedAccounts.map((account) => ({
				id: account.id,
				code: account.code,
				name: account.name,
				level: account.level,
				debit: account.currentDebit,
				credit: account.currentCredit,
				balance: account.balance,
				previousDebit: account.previousDebit,
				previousCredit: account.previousCredit,
				isDebit: account.isDebit
			})),
			totals: {
				debit: data.totals.currentDebit,
				credit: data.totals.currentCredit,
				previousDebit: data.totals.previousDebit,
				previousCredit: data.totals.previousCredit,
				balanceDebit: data.totals.balanceDebit,
				balanceCredit: data.totals.balanceCredit
			}
		};

		const lastDayOfMonth = new Date(
			data.selectedPeriod.year,
			data.selectedPeriod.month,
			0
		).getDate();

		const dateRange = $derived({
			start: `${data.selectedPeriod.year}-${data.selectedPeriod.month.toString().padStart(2, '0')}-01`,
			end: `${data.selectedPeriod.year}-${data.selectedPeriod.month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`
		});

		if (type === 'pdf') {
			await exportAccountBalanceToPdf(exportData, dateRange);
		} else {
			await exportAccountBalanceToExcel(exportData, dateRange);
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Account Balance</h1>
			{#if journalType && journalType !== 'all'}
				<div class="mt-2">
					<div class="badge badge-info">
						Filter: {journalType === 'commitment'
							? 'Hanya Komitmen'
							: journalType === 'breakdown'
								? 'Hanya Breakdown'
								: 'Net Transactions'}
					</div>
				</div>
			{/if}
		</div>
		<div class="flex gap-2">
			<button class="btn btn-primary" onclick={() => handleExport('excel')}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				Export to Excel
			</button>
			<button class="btn btn-primary" onclick={() => handleExport('pdf')}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="mr-2 h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
					/>
				</svg>
				Export to PDF
			</button>
		</div>
	</div>

	<div class="print:hidden">
		<div class="flex gap-4">
			<div class="form-control w-full max-w-xs">
				<label class="label" for="period-select">
					<span class="label-text">Fiscal Period</span>
				</label>
				<select
					id="period-select"
					class="select select-bordered w-full"
					bind:value={selectedPeriodId}
				>
					{#each data.periods as period}
						<option value={period.id}>{period.name}</option>
					{/each}
				</select>
			</div>

			<div class="form-control w-full max-w-xs">
				<label class="label" for="journal-type-select">
					<span class="label-text">Journal Type</span>
				</label>
				<select
					id="journal-type-select"
					class="select select-bordered w-full"
					bind:value={journalType}
				>
					<option value="all">Semua Journal</option>
					<option value="commitment">Hanya Komitmen</option>
					<option value="breakdown">Hanya Breakdown</option>
					<option value="net">Net Transactions</option>
				</select>
			</div>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Account</th>
					<th>Name</th>
					<th class="text-right">Previous Debit</th>
					<th class="text-right">Previous Credit</th>
					<th class="text-right">Current Debit</th>
					<th class="text-right">Current Credit</th>
					<th class="text-right">Balance Debit</th>
					<th class="text-right">Balance Credit</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedAccounts as account}
					<tr>
						<td class="pl-{account.level * 4}">
							<span class="font-mono">{account.code}</span>
						</td>
						<td>{account.name}</td>
						<td class="text-right">{formatCurrencyWithParentheses(account.previousDebit)}</td>
						<td class="text-right">{formatCurrencyWithParentheses(account.previousCredit)}</td>
						<td class="text-right">{formatCurrencyWithParentheses(account.currentDebit)}</td>
						<td class="text-right">{formatCurrencyWithParentheses(account.currentCredit)}</td>
						<td class="text-right"
							>{formatCurrencyWithParentheses(account.isDebit ? account.balance : 0)}</td
						>
						<td class="text-right"
							>{formatCurrencyWithParentheses(!account.isDebit ? account.balance : 0)}</td
						>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="font-bold">
					<td colspan="2">Total</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.totals.previousDebit)}</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.totals.previousCredit)}</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.totals.currentDebit)}</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.totals.currentCredit)}</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.totals.balanceDebit)}</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.totals.balanceCredit)}</td>
				</tr>
			</tfoot>
		</table>
	</div>
</div>
