<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrencyWithDecimals, formatDate } from '$lib/utils/utils.client';
	import { onMount } from 'svelte';
	import { exportGLDetailToPdf, exportGLDetailToExcel } from '$lib/utils/exports/glDetailExport';
	import SearchAbleSelect from '$lib/components/SearchAbleSelect.svelte';

	let { data } = $props();
	let isLoading = $state(false);
	let isInitialized = $state(false);

	let dateRange = $state({
		start: data.dateRange.start,
		end: data.dateRange.end
	});

	let selectedAccountId = $state(data.selectedAccountId || '');

	// Initialize from URL params only once on mount
	onMount(() => {
		if (browser) {
			const searchParams = new URLSearchParams(window.location.search);
			const startDate = searchParams.get('startDate');
			const endDate = searchParams.get('endDate');
			const accountId = searchParams.get('accountId');

			if (startDate) dateRange.start = startDate;
			if (endDate) dateRange.end = endDate;
			if (accountId) selectedAccountId = accountId;
		}
		isInitialized = true;
	});

	let updateTimeout: NodeJS.Timeout;

	// Debounced URL update
	async function updateURL() {
		if (!browser || !isInitialized) return;

		isLoading = true;
		try {
			const params = new URLSearchParams();
			params.set('startDate', dateRange.start);
			params.set('endDate', dateRange.end);
			if (selectedAccountId) {
				params.set('accountId', selectedAccountId);
			} else {
				params.delete('accountId');
			}

			clearTimeout(updateTimeout);
			updateTimeout = setTimeout(async () => {
				await goto(`?${params.toString()}`, { replaceState: true, invalidateAll: true });
			}, 300);
		} finally {
			isLoading = false;
		}
	}

	// Watch for filter changes
	$effect(() => {
		if (isInitialized) {
			updateURL();
		}
	});

	function handleDateRangeChange(event: CustomEvent<{ start: string; end: string }>) {
		dateRange = event.detail;
	}

	async function handlePdfExport() {
		try {
			const exportData = {
				detailData: data.reportData.flatMap((account) =>
					account.transactions.map((trx) => ({
						accountId: account.accountId,
						accountCode: account.accountCode,
						accountName: account.accountName,
						date: trx.date,
						journalNumber: trx.journalNumber,
						reffNumber: trx.reffNumber,
						note: trx.note,
						detailNote: trx.detailNote,
						openingBalance: account.openingBalance,
						debit: trx.debit,
						credit: trx.credit,
						balance: trx.balance
					}))
				),
				totals: {
					openingBalance: data.reportData.reduce((sum, acc) => sum + acc.openingBalance, 0),
					debit: data.reportData.reduce((sum, acc) => sum + acc.totalDebit, 0),
					credit: data.reportData.reduce((sum, acc) => sum + acc.totalCredit, 0),
					balance: data.reportData.reduce((sum, acc) => sum + acc.endingBalance, 0)
				}
			};

			await exportGLDetailToPdf(exportData, dateRange);
		} catch (error) {
			console.error('Failed to export PDF:', error);
			alert('Failed to export PDF. Please try again.');
		} finally {
			console.error('Done exporting PDF');
		}
	}

	async function handleExcelExport() {
		try {
			const exportData = {
				detailData: data.reportData.flatMap((account) =>
					account.transactions.map((trx) => ({
						accountId: account.accountId,
						accountCode: account.accountCode,
						accountName: account.accountName,
						date: trx.date,
						journalNumber: trx.journalNumber,
						reffNumber: trx.reffNumber,
						note: trx.note,
						detailNote: trx.detailNote,
						openingBalance: account.openingBalance,
						debit: trx.debit,
						credit: trx.credit,
						balance: trx.balance
					}))
				),
				totals: {
					openingBalance: data.reportData.reduce((sum, acc) => sum + acc.openingBalance, 0),
					debit: data.reportData.reduce((sum, acc) => sum + acc.totalDebit, 0),
					credit: data.reportData.reduce((sum, acc) => sum + acc.totalCredit, 0),
					balance: data.reportData.reduce((sum, acc) => sum + acc.endingBalance, 0)
				}
			};

			await exportGLDetailToExcel(exportData, dateRange);
		} catch (error) {
			console.error('Failed to export Excel:', error);
			alert('Failed to export Excel. Please try again.');
		} finally {
			console.log('Done Exporting Excel');
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="print:hidden">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold">General Ledger Detail</h1>
			<div class="flex gap-2">
				<button class="btn btn-primary" onclick={handleExcelExport}> Export to Excel </button>
				<button class="btn btn-primary" onclick={handlePdfExport}> Export to PDF </button>
			</div>
		</div>
	</div>

	<div class="space-y-4 print:hidden">
		<ReportFilters {dateRange} onchange={handleDateRangeChange} />
		<div class="form-control w-full max-w-xs">
			<label for="account-select" class="label">
				<span class="label-text">Filter Akun</span>
			</label>
			<SearchAbleSelect
				items={data.accounts}
				bind:value={selectedAccountId}
				placeholder="Pilih Akun"
			/>
		</div>
	</div>

	<div class="print-header mb-4 hidden text-xs print:block">
		<h1 class="text-center text-xl font-bold">General Ledger Detail</h1>
		<div class="mt-2 grid grid-cols-4 gap-x-4">
			<div><strong>From:</strong> {formatDate(dateRange.start)}</div>
			<div><strong>Client:</strong> -</div>
			<div><strong>To:</strong> {formatDate(dateRange.end)}</div>
			<div><strong>Vendor:</strong> -</div>
			<div class="col-span-2">
				<strong>Filter Account:</strong>
				{#if selectedAccountId}
					{@const selectedAccount = data.accounts.find((a) => a.id === selectedAccountId)}
					{#if selectedAccount}
						{selectedAccount.code} - {selectedAccount.name}
					{/if}
				{:else}
					All
				{/if}
			</div>
			<div class="col-span-2"><strong>Project:</strong> -</div>
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if data.reportData.length === 0}
		<div class="py-8 text-center">No data available for the selected date range.</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table-zebra table-sm table w-full text-xs">
				<thead>
					<tr class="font-bold">
						<td class="w-[15%]">Account<br />Date</td>
						<td class="w-[20%]">Account Name<br />Journal Number</td>
						<td class="w-[10%]">Reff Number</td>
						<td class="w-[15%]">Note</td>
						<td class="w-[15%]">Detail Note</td>
						<td class="w-[8%] text-right">Opening<br />Debit</td>
						<td class="w-[8%] text-right">Credit</td>
						<td class="w-[9%] text-right">Balance</td>
					</tr>
				</thead>
				<tbody>
					{#each data.reportData as accountData}
						<tr class="bg-base-200 font-bold">
							<td>{accountData.accountCode}</td>
							<td colspan="4">{accountData.accountName}</td>
							<td colspan="3">{formatCurrencyWithDecimals(accountData.openingBalance)}</td>
						</tr>
						{#each accountData.transactions as trx}
							<tr>
								<td>{formatDate(trx.date)}</td>
								<td>{trx.journalNumber}</td>
								<td>{trx.reffNumber}</td>
								<td>{trx.note}</td>
								<td>{trx.detailNote}</td>
								<td class="text-right">{formatCurrencyWithDecimals(trx.debit)}</td>
								<td class="text-right">{formatCurrencyWithDecimals(trx.credit)}</td>
								<td class="text-right">{formatCurrencyWithDecimals(trx.balance)}</td>
							</tr>
						{/each}
						<tr class="border-t-2 font-bold">
							<td colspan="5" class="text-left">Total {accountData.accountCode}</td>
							<td class="text-right">{formatCurrencyWithDecimals(accountData.totalDebit)}</td>
							<td class="text-right">{formatCurrencyWithDecimals(accountData.totalCredit)}</td>
							<td class="text-right">{formatCurrencyWithDecimals(accountData.endingBalance)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
