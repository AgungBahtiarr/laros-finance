<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency } from '$lib/utils/utils.client';
	import {
		exportAccountBalanceToPdf,
		exportAccountBalanceToExcel
	} from '$lib/utils/exports/accountBalanceExport';

	let { data } = $props();

	let dateRange = $state({
		start: new Date().toISOString().split('T')[0],
		end: new Date().toISOString().split('T')[0]
	});

	// Initialize values from URL params on client-side only
	if (browser) {
		const searchParams = new URLSearchParams(window.location.search);
		dateRange = {
			start: searchParams.get('startDate') || dateRange.start,
			end: searchParams.get('endDate') || dateRange.end
		};
	}

	$effect(() => {
		if (browser) {
			const params = new URLSearchParams();
			params.set('startDate', dateRange.start);
			params.set('endDate', dateRange.end);
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

	// Get current period from the date range
	let currentPeriod = $derived(() => {
		const date = new Date(dateRange.start);
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		return { year, month };
	});

	async function handlePdfExport() {
		const period = {
			year: currentPeriod().year,
			month: currentPeriod().month
		};

		const exportData = {
			accounts: sortedAccounts.map((account) => ({
				code: account.code,
				name: account.name,
				debit: account.debit,
				credit: account.credit,
				debitMovement: account.debitMovement || 0,
				creditMovement: account.creditMovement || 0,
				finalDebit: account.finalDebit || 0,
				finalCredit: account.finalCredit || 0
			})),
			totals: {
				debit: data.totals.debit,
				credit: data.totals.credit,
				debitMovement: data.totals.debitMovement || 0,
				creditMovement: data.totals.creditMovement || 0,
				finalDebit: data.totals.finalDebit || 0,
				finalCredit: data.totals.finalCredit || 0
			},
			period
		};
		await exportAccountBalanceToPdf(exportData);
	}

	async function handleExcelExport() {
		const period = {
			year: currentPeriod().year,
			month: currentPeriod().month
		};

		const exportData = {
			accounts: sortedAccounts.map((account) => ({
				code: account.code,
				name: account.name,
				debit: account.debit,
				credit: account.credit,
				debitMovement: account.debitMovement || 0,
				creditMovement: account.creditMovement || 0,
				finalDebit: account.finalDebit || 0,
				finalCredit: account.finalCredit || 0
			})),
			totals: {
				debit: data.totals.debit,
				credit: data.totals.credit,
				debitMovement: data.totals.debitMovement || 0,
				creditMovement: data.totals.creditMovement || 0,
				finalDebit: data.totals.finalDebit || 0,
				finalCredit: data.totals.finalCredit || 0
			},
			period
		};
		await exportAccountBalanceToExcel(exportData);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Account Balance</h1>
		<div class="flex gap-2">
			<button class="btn btn-primary" on:click={handleExcelExport}>
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
			<button class="btn btn-primary" on:click={handlePdfExport}>
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
			<button class="btn btn-primary" on:click={() => window.print()}>
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
		<ReportFilters {dateRange} />
	</div>

	<div class="overflow-x-auto">
		<div class="mb-4">
			<h2 class="text-lg">Year: {currentPeriod().year}</h2>
			<h2 class="text-lg">Month: {currentPeriod().month}</h2>
		</div>

		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Account</th>
					<th>Name</th>
					<th class="text-right">Debit</th>
					<th class="text-right">Credit</th>
					<th class="text-right">Debit</th>
					<th class="text-right">Credit</th>
					<th class="text-right">Debit</th>
					<th class="text-right">Credit</th>
				</tr>
			</thead>

			<tbody>
				{#each sortedAccounts as account}
					<tr>
						<td>{account.code}</td>
						<td>{account.name}</td>
						<td class="text-right">{formatCurrency(account.debit)}</td>
						<td class="text-right">{formatCurrency(account.credit)}</td>
						<td class="text-right">{formatCurrency(account.debitMovement || 0)}</td>
						<td class="text-right">{formatCurrency(account.creditMovement || 0)}</td>
						<td class="text-right">{formatCurrency(account.finalDebit || 0)}</td>
						<td class="text-right">{formatCurrency(account.finalCredit || 0)}</td>
					</tr>
				{/each}

				<!-- Totals -->
				<tr class="text-lg font-bold">
					<td colspan="2">TOTAL</td>
					<td class="text-right">{formatCurrency(data.totals.debit)}</td>
					<td class="text-right">{formatCurrency(data.totals.credit)}</td>
					<td class="text-right">{formatCurrency(data.totals.debitMovement || 0)}</td>
					<td class="text-right">{formatCurrency(data.totals.creditMovement || 0)}</td>
					<td class="text-right">{formatCurrency(data.totals.finalDebit || 0)}</td>
					<td class="text-right">{formatCurrency(data.totals.finalCredit || 0)}</td>
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
