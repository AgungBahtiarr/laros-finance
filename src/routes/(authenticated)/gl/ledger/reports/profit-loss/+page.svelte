<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { formatCurrencyWithParentheses } from '$lib/utils/utils.client';
	import { exportToPdf, exportToExcel } from '$lib/utils/exports/profitNLossExport';
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
	const dateRange = {
		start: `${data.selectedPeriod.year}-${data.selectedPeriod.month.toString().padStart(2, '0')}-01`,
		end: `${data.selectedPeriod.year}-${data.selectedPeriod.month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`
	};

	async function handleExport(type: 'pdf' | 'excel') {
		if (type === 'pdf') {
			await exportToPdf(data, dateRange, false, false);
		} else {
			await exportToExcel(data, dateRange, false, false);
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Profit & Loss Statement</h1>
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
			<button class="btn btn-primary" on:click={() => handleExport('excel')}>
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
			<button class="btn btn-primary" on:click={() => handleExport('pdf')}>
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
					<th class="text-right">Current Period</th>
				</tr>
			</thead>
			<tbody>
				<!-- Pendapatan -->
				<tr class="bg-base-200 font-bold">
					<td colspan={2}>Pendapatan</td>
				</tr>
				{#if data.pendapatan && data.pendapatan.length > 0}
					{#each data.pendapatan as item}
						<tr>
							<td class="pl-{item.level * 4}">{item.name}</td>
							<td class="text-right">{formatCurrencyWithParentheses(item.balance || 0)}</td>
						</tr>
					{/each}
					<tr class="font-bold">
						<td>Total Pendapatan</td>
						<td class="text-right"
							>{formatCurrencyWithParentheses(
								data.pendapatan.reduce((sum, item) => sum + (item.balance || 0), 0)
							)}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan={2} class="text-center text-gray-500"
							>No revenue data found for the selected period</td
						>
					</tr>
				{/if}

				<!-- Biaya Operasional -->
				<tr class="bg-base-200 font-bold">
					<td colspan={2}>Biaya Operasional</td>
				</tr>
				{#if data.biayaOperasional && data.biayaOperasional.length > 0}
					{#each data.biayaOperasional as item}
						<tr>
							<td class="pl-{item.level * 4}">{item.name}</td>
							<td class="text-right">{formatCurrencyWithParentheses(item.balance || 0)}</td>
						</tr>
					{/each}
					<tr class="font-bold">
						<td>Total Biaya Operasional</td>
						<td class="text-right"
							>{formatCurrencyWithParentheses(
								data.biayaOperasional.reduce((sum, item) => sum + (item.balance || 0), 0)
							)}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan={2} class="text-center text-gray-500">No data found</td>
					</tr>
				{/if}

				<!-- Biaya Operasional Lainnya -->
				<tr class="bg-base-200 font-bold">
					<td colspan={2}>Biaya Operasional Lainnya</td>
				</tr>
				{#if data.biayaOperasionalLainnya && data.biayaOperasionalLainnya.length > 0}
					{#each data.biayaOperasionalLainnya as item}
						<tr>
							<td class="pl-{item.level * 4}">{item.name}</td>
							<td class="text-right">{formatCurrencyWithParentheses(item.balance || 0)}</td>
						</tr>
					{/each}
					<tr class="font-bold">
						<td>Total Biaya Operasional Lainnya</td>
						<td class="text-right"
							>{formatCurrencyWithParentheses(
								data.biayaOperasionalLainnya.reduce((sum, item) => sum + (item.balance || 0), 0)
							)}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan={2} class="text-center text-gray-500">No data found</td>
					</tr>
				{/if}

				<!-- Biaya Administrasi & Umum -->
				<tr class="bg-base-200 font-bold">
					<td colspan={2}>Biaya Administrasi & Umum</td>
				</tr>
				{#if data.biayaAdministrasiUmum && data.biayaAdministrasiUmum.length > 0}
					{#each data.biayaAdministrasiUmum as item}
						<tr>
							<td class="pl-{item.level * 4}">{item.name}</td>
							<td class="text-right">{formatCurrencyWithParentheses(item.balance || 0)}</td>
						</tr>
					{/each}
					<tr class="font-bold">
						<td>Total Biaya Administrasi & Umum</td>
						<td class="text-right"
							>{formatCurrencyWithParentheses(
								data.biayaAdministrasiUmum.reduce((sum, item) => sum + (item.balance || 0), 0)
							)}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan={2} class="text-center text-gray-500">No data found</td>
					</tr>
				{/if}

				<!-- (Pendapatan) Biaya Lain-Lain -->
				<tr class="bg-base-200 font-bold">
					<td colspan={2}>(Pendapatan) Biaya Lain-Lain</td>
				</tr>
				{#if data.pendapatanBiayaLainLain && data.pendapatanBiayaLainLain.length > 0}
					{#each data.pendapatanBiayaLainLain as item}
						<tr>
							<td class="pl-{item.level * 4}">{item.name}</td>
							<td class="text-right">{formatCurrencyWithParentheses(item.balance || 0)}</td>
						</tr>
					{/each}
					<tr class="font-bold">
						<td>Total (Pendapatan) Biaya Lain-Lain</td>
						<td class="text-right"
							>{formatCurrencyWithParentheses(
								data.pendapatanBiayaLainLain.reduce((sum, item) => sum + (item.balance || 0), 0)
							)}</td
						>
					</tr>
				{:else}
					<tr>
						<td colspan={2} class="text-center text-gray-500">No data found</td>
					</tr>
				{/if}

				<tr class="text-lg font-bold">
					<td>Net Income</td>
					<td class="text-right">{formatCurrencyWithParentheses(data.netIncome || 0)}</td>
				</tr>
			</tbody>
		</table>
	</div>

	{#if !data.revenues?.length && !data.expenses?.length}
		<div class="alert alert-info">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				class="h-6 w-6 shrink-0 stroke-current"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<span
				>No journal entries found for the selected period. Make sure you have posted journal entries
				with revenue and expense accounts for the selected period.</span
			>
		</div>
	{/if}
</div>
