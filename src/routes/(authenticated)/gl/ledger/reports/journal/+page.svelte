<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrencyWithDecimals, formatDate } from '$lib/utils/utils.client';
	import type { PageData } from './$types';
	import { exportJournalToExcel } from '$lib/utils/exports/journalExport';

	let { data } = $props();

	let dateRange = $state({
		start: new Date().toISOString().split('T')[0],
		end: new Date().toISOString().split('T')[0]
	});

	let journalType = $state(data.filters?.journalType || 'all');

	// Initialize values from URL params on client-side only
	if (browser) {
		const searchParams = new URLSearchParams(window.location.search);
		dateRange = {
			start: searchParams.get('startDate') || dateRange.start,
			end: searchParams.get('endDate') || dateRange.end
		};
		journalType = searchParams.get('journalType') || 'all';
	}

	$effect(() => {
		if (browser) {
			const params = new URLSearchParams();
			params.set('startDate', dateRange.start);
			params.set('endDate', dateRange.end);
			if (journalType && journalType !== 'all') {
				params.set('journalType', journalType);
			}
			goto(`?${params.toString()}`, { replaceState: true });
		}
	});

	async function handleExcelExport() {
		const exportData = {
			entries: data.entries.map((entry) => ({
				...entry,
				details: entry.details.map((detail) => ({
					...detail,
					debit: Number(detail.debit || 0),
					credit: Number(detail.credit || 0)
				}))
			})),
			totals: {
				debit: Number(data.totals.debit),
				credit: Number(data.totals.credit)
			},
			period: {
				start: dateRange.start,
				end: dateRange.end
			}
		};
		await exportJournalToExcel(exportData);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Journal Report</h1>
			{#if journalType && journalType !== 'all'}
				<div class="mt-2">
					<div class="badge badge-info">
						Filter: {journalType === 'commitment'
							? 'Hanya Komitmen'
							: journalType === 'breakdown'
								? 'Hanya Breakdown'
								: journalType === 'paired'
									? 'Journal Berpasangan'
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
		</div>
	</div>

	<div class="print:hidden">
		<div class="flex gap-4">
			<div class="flex-1">
				<ReportFilters {dateRange} />
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
					<option value="paired">Journal Berpasangan</option>
					<option value="net">Net Transactions</option>
				</select>
			</div>
		</div>
	</div>

	<div class="overflow-x-auto">
		{#each data.entries as entry}
			<div class="border-base-300 bg-base-100 mb-6 rounded-lg border p-4 shadow-sm">
				<div class="mb-4 flex items-start justify-between">
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-lg font-semibold">Journal #{entry.number}</h3>
							{#if entry.number.startsWith('b')}
								<div class="badge badge-info badge-sm">Breakdown</div>
							{:else if data.entries.some((e) => e.number === 'b' + entry.number)}
								<div class="badge badge-success badge-sm">Komitmen (Has Pair)</div>
							{:else}
								<div class="badge badge-primary badge-sm">Komitmen</div>
							{/if}
						</div>
						<p class="text-base-content/70 text-sm">{formatDate(entry.date)}</p>
						{#if entry.reference}
							<p class="text-base-content/70 text-sm">Ref: {entry.reference}</p>
						{/if}
					</div>
					<div class="text-right">
						<p class="text-base-content/70 text-sm">Description:</p>
						<p class="max-w-md text-sm">{entry.description}</p>
					</div>
				</div>

				<table class="table w-full">
					<thead>
						<tr>
							<th>Account</th>
							<th>Description</th>
							<th class="text-right">Debit</th>
							<th class="text-right">Credit</th>
						</tr>
					</thead>
					<tbody>
						{#each entry.details as detail}
							<tr>
								<td>
									<span class="font-mono">{detail.accountCode}</span> - {detail.accountName}
								</td>
								<td>{detail.description}</td>
								<td class="text-right">
									{detail.debit ? formatCurrencyWithDecimals(detail.debit) : '-'}
								</td>
								<td class="text-right">
									{detail.credit ? formatCurrencyWithDecimals(detail.credit) : '-'}
								</td>
							</tr>
						{/each}
						<tr class="font-semibold">
							<td colspan="2">Entry Total</td>
							<td class="text-right">
								{formatCurrencyWithDecimals(
									entry.details.reduce((sum: number, d: any) => sum + Number(d.debit || 0), 0)
								)}
							</td>
							<td class="text-right">
								{formatCurrencyWithDecimals(
									entry.details.reduce((sum: number, d: any) => sum + Number(d.credit || 0), 0)
								)}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		{/each}

		<div class="border-base-300 bg-base-100 mt-8 rounded-lg border p-4 shadow-sm">
			<h3 class="mb-4 text-lg font-semibold">Report Summary</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<table class="table w-full">
					<thead>
						<tr>
							<th>Period</th>
							<th class="text-right">Total Debit</th>
							<th class="text-right">Total Credit</th>
						</tr>
					</thead>
					<tbody>
						<tr class="text-lg font-bold">
							<td>{formatDate(dateRange.start)} - {formatDate(dateRange.end)}</td>
							<td class="text-right">{formatCurrencyWithDecimals(data.totals.debit)}</td>
							<td class="text-right">{formatCurrencyWithDecimals(data.totals.credit)}</td>
						</tr>
					</tbody>
				</table>

				{#if journalType === 'paired'}
					<div class="stats stats-vertical lg:stats-horizontal">
						<div class="stat">
							<div class="stat-title">Total Journals</div>
							<div class="stat-value text-sm">{data.entries.length}</div>
							<div class="stat-desc">Paired journals only</div>
						</div>
						<div class="stat">
							<div class="stat-title">Breakdown Journals</div>
							<div class="stat-value text-info text-sm">
								{data.entries.filter((e) => e.number.startsWith('b')).length}
							</div>
						</div>
						<div class="stat">
							<div class="stat-title">Commitment Journals</div>
							<div class="stat-value text-success text-sm">
								{data.entries.filter((e) => !e.number.startsWith('b')).length}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
