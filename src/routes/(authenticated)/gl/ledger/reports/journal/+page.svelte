<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency, formatDate } from '$lib/utils/utils.client';
	import type { PageData } from './$types';
	import { exportJournalToPdf, exportJournalToExcel } from '$lib/utils/exports/journalExport';

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

	async function handlePdfExport() {
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
		await exportJournalToPdf(exportData);
	}

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
		<h1 class="text-2xl font-bold">Journal Report</h1>
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
		<ReportFilters {dateRange} />
	</div>

	<div class="overflow-x-auto">
		{#each data.entries as entry}
			<div class="border-base-300 bg-base-100 mb-6 rounded-lg border p-4 shadow-sm">
				<div class="mb-4 flex items-start justify-between">
					<div>
						<h3 class="text-lg font-semibold">Journal #{entry.number}</h3>
						<p class="text-base-content/70 text-sm">{formatDate(entry.date)}</p>
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
									{detail.debit ? formatCurrency(detail.debit) : '-'}
								</td>
								<td class="text-right">
									{detail.credit ? formatCurrency(detail.credit) : '-'}
								</td>
							</tr>
						{/each}
						<tr class="font-semibold">
							<td colspan="2">Entry Total</td>
							<td class="text-right">
								{formatCurrency(
									entry.details.reduce((sum: number, d: any) => sum + Number(d.debit || 0), 0)
								)}
							</td>
							<td class="text-right">
								{formatCurrency(
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
						<td class="text-right">{formatCurrency(data.totals.debit)}</td>
						<td class="text-right">{formatCurrency(data.totals.credit)}</td>
					</tr>
				</tbody>
			</table>
		</div>
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
