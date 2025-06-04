<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency, calculatePercentage, calculateChange } from '$lib/utils/utils.client';
	import {
		exportTrialBalanceToPdf,
		exportTrialBalanceToExcel
	} from '$lib/utils/exports/trialBalanceExport';

	interface Account {
		id: string;
		code: string;
		name: string;
		type: string;
		level: number;
		debit: number;
		credit: number;
		balance: number;
		previousPeriodDebit?: number;
		previousPeriodCredit?: number;
		groupCode?: string;
		groupName?: string;
		parentId?: string;
	}

	let { data } = $props<{
		data: {
			accounts: Account[];
			totals: {
				debit: number;
				credit: number;
			};
			previousPeriod?: {
				accounts: Account[];
				totals: {
					debit: number;
					credit: number;
				};
			};
		};
	}>();

	let dateRange = $state({
		start: new Date().toISOString().split('T')[0],
		end: new Date().toISOString().split('T')[0]
	});

	let compareWithPrevious = $state(false);
	let showPercentages = $state(false);

	if (browser) {
		const searchParams = new URLSearchParams(window.location.search);
		dateRange = {
			start: searchParams.get('startDate') || dateRange.start,
			end: searchParams.get('endDate') || dateRange.end
		};
		compareWithPrevious = searchParams.get('compareWithPrevious') === 'true';
		showPercentages = searchParams.get('showPercentages') === 'true';
	}

	$effect(() => {
		if (browser) {
			const params = new URLSearchParams();
			params.set('startDate', dateRange.start);
			params.set('endDate', dateRange.end);
			params.set('compareWithPrevious', compareWithPrevious.toString());
			params.set('showPercentages', showPercentages.toString());
			goto(`?${params.toString()}`, { replaceState: true });
		}
	});

	// Sort accounts by type and code
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

	async function handlePdfExport() {
		const exportData = {
			accounts: sortedAccounts.map((account) => ({
				id: account.id,
				code: account.code,
				name: account.name,
				type: account.type,
				debit: account.debit,
				credit: account.credit,
				previousDebit: account.previousPeriodDebit || 0,
				previousCredit: account.previousPeriodCredit || 0
			})),
			totals: {
				debit: data.totals.debit,
				credit: data.totals.credit,
				previousDebit: data.previousPeriod?.totals.debit || 0,
				previousCredit: data.previousPeriod?.totals.credit || 0
			}
		};
		await exportTrialBalanceToPdf(exportData, dateRange);
	}

	async function handleExcelExport() {
		const exportData = {
			accounts: sortedAccounts.map((account) => ({
				id: account.id,
				code: account.code,
				name: account.name,
				type: account.type,
				debit: account.debit,
				credit: account.credit,
				previousDebit: account.previousPeriodDebit || 0,
				previousCredit: account.previousPeriodCredit || 0
			})),
			totals: {
				debit: data.totals.debit,
				credit: data.totals.credit,
				previousDebit: data.previousPeriod?.totals.debit || 0,
				previousCredit: data.previousPeriod?.totals.credit || 0
			}
		};
		await exportTrialBalanceToExcel(exportData, dateRange);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Trial Balance</h1>
		<div class="flex gap-2">
			<button class="btn btn-primary" onclick={handleExcelExport}>
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
			<button class="btn btn-primary" onclick={handlePdfExport}>
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
			<button class="btn btn-primary" onclick={() => window.print()}>
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
						d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
					/>
				</svg>
				Print
			</button>
		</div>
	</div>

	<div class="print:hidden">
		<ReportFilters
			{dateRange}
			showCompareOption={true}
			showPercentagesOption={true}
			bind:compareWithPrevious
			bind:showPercentages
		/>
	</div>

	<div class="overflow-x-auto">
		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Account</th>
					<th>Type</th>
					<th class="text-right">Previous Debit</th>
					<th class="text-right">Previous Credit</th>
					<th class="text-right">Current Debit</th>
					<th class="text-right">Current Credit</th>
					<th class="text-right">Balance Debit</th>
					<th class="text-right">Balance Credit</th>
					{#if showPercentages}
						<th class="text-right">% of Total</th>
					{/if}
				</tr>
			</thead>

			<tbody>
				{#each sortedAccounts as account}
					{@const previousBalance =
						(account.previousPeriodDebit || 0) - (account.previousPeriodCredit || 0)}
					{@const currentBalance = account.debit - account.credit}
					{@const finalBalance = previousBalance - currentBalance}
					<tr>
						<td class="pl-{account.level * 4}">
							<span class="font-mono">{account.code}</span> - {account.name}
						</td>
						<td>{account.type}</td>
						<td class="text-right">{formatCurrency(account.previousPeriodDebit || 0)}</td>
						<td class="text-right">{formatCurrency(account.previousPeriodCredit || 0)}</td>
						<td class="text-right">{formatCurrency(account.debit)}</td>
						<td class="text-right">{formatCurrency(account.credit)}</td>
						<td class="text-right">
							{formatCurrency(finalBalance > 0 ? Math.abs(finalBalance) : 0)}
						</td>
						<td class="text-right">
							{formatCurrency(finalBalance < 0 ? Math.abs(finalBalance) : 0)}
						</td>
						{#if showPercentages}
							<td class="text-right">
								{calculatePercentage(
									Math.abs(finalBalance),
									Math.abs(data.totals.debit - data.totals.credit)
								)}
							</td>
						{/if}
					</tr>
				{/each}

				<!-- Totals -->
				<tr class="text-lg font-bold">
					<td colspan="2">Total</td>
					<td class="text-right">{formatCurrency(data.previousPeriod?.totals.debit || 0)}</td>
					<td class="text-right">{formatCurrency(data.previousPeriod?.totals.credit || 0)}</td>
					<td class="text-right">{formatCurrency(data.totals.debit)}</td>
					<td class="text-right">{formatCurrency(data.totals.credit)}</td>
					<td class="text-right">
						{formatCurrency(
							Math.max(0, (data.previousPeriod?.totals.debit || 0) - data.totals.debit)
						)}
					</td>
					<td class="text-right">
						{formatCurrency(
							Math.max(0, (data.previousPeriod?.totals.credit || 0) - data.totals.credit)
						)}
					</td>
					{#if showPercentages}
						<td class="text-right">100%</td>
					{/if}
				</tr>
			</tbody>
		</table>
	</div>
</div>

<style>
	@media print {
		.table {
			font-size: 12px;
		}

		.table th,
		.table td {
			padding: 0.5rem;
		}
	}
</style>
