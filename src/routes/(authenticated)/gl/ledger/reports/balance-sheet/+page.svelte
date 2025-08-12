<!-- src/routes/(authenticated)/gl/ledger/reports/balance-sheet/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { formatCurrencyWithDecimals } from '$lib/utils/utils.client';
	import {
		exportBalanceSheetToPdf,
		exportBalanceSheetToExcel
	} from '$lib/utils/exports/balanceSheetExport';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

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
	const lastDayOfMonth = new Date(data.selectedPeriod.year, data.selectedPeriod.month, 0).getDate();

	const dateRange = $derived({
		start: `${data.selectedPeriod.year}-${data.selectedPeriod.month.toString().padStart(2, '0')}-01`,
		end: `${data.selectedPeriod.year}-${data.selectedPeriod.month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`
	});

	async function handlePdfExport() {
		await exportBalanceSheetToPdf(data, dateRange, false, false);
	}

	async function handleExcelExport() {
		await exportBalanceSheetToExcel(data, dateRange, false, false);
	}

	let totalAktiva = $derived(data.totalAktiva?.balance || 0);
	let totalPasiva = $derived(data.totalPasiva?.balance || 0);
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Neraca (Balance Sheet)</h1>
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

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Aktiva -->
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Aktiva (Assets)</th>
						<th class="text-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					<!-- Aktiva Lancar -->
					<tr class="bg-base-200 font-bold">
						<td colspan={2}>Aktiva Lancar (Current Assets)</td>
					</tr>
					{#if data.aktivaLancar && data.aktivaLancar.length > 0}
						{#each data.aktivaLancar as asset}
							<tr>
								<td class="pl-{asset.level * 4}">{asset.name}</td>
								<td class="text-right">{formatCurrencyWithDecimals(asset.balance || 0)}</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan={2} class="text-center text-gray-500"
								>No current assets found for the selected period</td
							>
						</tr>
					{/if}
					<!-- Aktiva Tetap -->
					<tr class="bg-base-200 font-bold">
						<td colspan={2}>Aktiva Tetap (Fixed Assets)</td>
					</tr>
					{#if data.aktivaTetap && data.aktivaTetap.length > 0}
						{#each data.aktivaTetap as asset}
							<tr>
								<td class="pl-{asset.level * 4}">{asset.name}</td>
								<td class="text-right">{formatCurrencyWithDecimals(asset.balance || 0)}</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan={2} class="text-center text-gray-500"
								>No fixed assets found for the selected period</td
							>
						</tr>
					{/if}
					<!-- Aktiva Lainnya -->
					<tr class="bg-base-200 font-bold">
						<td colspan={2}>Aktiva Lainnya (Other Assets)</td>
					</tr>
					{#if data.aktivaLainnya && data.aktivaLainnya.length > 0}
						{#each data.aktivaLainnya as asset}
							<tr>
								<td class="pl-{asset.level * 4}">{asset.name}</td>
								<td class="text-right">{formatCurrencyWithDecimals(asset.balance || 0)}</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan={2} class="text-center text-gray-500"
								>No other assets found for the selected period</td
							>
						</tr>
					{/if}
					<tr class="font-bold">
						<td>Total Aktiva</td>
						<td class="text-right">{formatCurrencyWithDecimals(totalAktiva)}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Pasiva -->
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Pasiva (Liabilities + Equity)</th>
						<th class="text-right">Amount</th>
					</tr>
				</thead>
				<tbody>
					<!-- Hutang Lancar -->
					<tr class="bg-base-200 font-bold">
						<td colspan={2}>Hutang Lancar (Current Liabilities)</td>
					</tr>
					{#if data.hutangLancar && data.hutangLancar.length > 0}
						{#each data.hutangLancar as liability}
							<tr>
								<td class="pl-{liability.level * 4}">{liability.name}</td>
								<td class="text-right">{formatCurrencyWithDecimals(liability.balance || 0)}</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan={2} class="text-center text-gray-500"
								>No current liabilities found for the selected period</td
							>
						</tr>
					{/if}
					<!-- Hutang Jangka Panjang -->
					<tr class="bg-base-200 font-bold">
						<td colspan={2}>Hutang Jangka Panjang (Long-term Liabilities)</td>
					</tr>
					{#if data.hutangJangkaPanjang && data.hutangJangkaPanjang.length > 0}
						{#each data.hutangJangkaPanjang as liability}
							<tr>
								<td class="pl-{liability.level * 4}">{liability.name}</td>
								<td class="text-right">{formatCurrencyWithDecimals(liability.balance || 0)}</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan={2} class="text-center text-gray-500"
								>No long-term liabilities found for the selected period</td
							>
						</tr>
					{/if}
					<!-- Modal (Equity) -->
					<tr class="bg-base-200 font-bold">
						<td colspan={2}>Modal (Equity)</td>
					</tr>
					{#if data.modal && data.modal.length > 0}
						{#each data.modal as eq}
							<tr>
								<td class="pl-{eq.level * 4}">{eq.name}</td>
								<td class="text-right">{formatCurrencyWithDecimals(eq.balance || 0)}</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan={2} class="text-center text-gray-500"
								>No equity found for the selected period</td
							>
						</tr>
					{/if}
					<tr>
						<td>Laba Rugi Berjalan</td>
						<td class="text-right">{formatCurrencyWithDecimals(data.netIncome || 0)}</td>
					</tr>
					<tr class="font-bold">
						<td>Total Pasiva</td>
						<td class="text-right">{formatCurrencyWithDecimals(totalPasiva)}</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>
