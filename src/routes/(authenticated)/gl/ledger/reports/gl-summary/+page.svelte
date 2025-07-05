<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrencyWithDecimals } from '$lib/utils/utils.client';
	import { onMount } from 'svelte';
	import { exportGLSummaryToPdf, exportGLSummaryToExcel } from '$lib/utils/exports/glSummaryExport';

	let { data } = $props();
	let searchQuery = $state('');
	let showDropdown = $state(false);
	let searchContainer: HTMLDivElement;
	let isLoading = $state(false);
	let isInitialized = $state(false);

	let dateRange = $state({
		start: new Date().toISOString().split('T')[0],
		end: new Date().toISOString().split('T')[0]
	});

	let selectedAccounts = $state(data.selectedAccounts);
	let selectedAccountDetails = $derived(
		data.accounts.filter((account) => selectedAccounts.includes(account.id))
	);

	let filteredAccounts = $derived(
		searchQuery
			? data.accounts
					.filter((account) => {
						const search = searchQuery.toLowerCase();
						return (
							(account.code.toLowerCase().includes(search) ||
								account.name.toLowerCase().includes(search)) &&
							!selectedAccounts.includes(account.id)
						);
					})
					.slice(0, 10) // Limit search results to improve performance
			: []
	);

	// Initialize from URL params only once on mount
	onMount(() => {
		if (browser) {
			const searchParams = new URLSearchParams(window.location.search);
			const startDate = searchParams.get('startDate');
			const endDate = searchParams.get('endDate');
			const accounts = searchParams.get('accounts');

			if (startDate) dateRange.start = startDate;
			if (endDate) dateRange.end = endDate;
			if (accounts) selectedAccounts = accounts.split(',').map(Number);
		}
		isInitialized = true;
	});

	// Handle clicks outside search dropdown
	onMount(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (searchContainer && !searchContainer.contains(event.target as Node)) {
				showDropdown = false;
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
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
			if (selectedAccounts.length > 0) {
				params.set('accounts', selectedAccounts.join(','));
			}

			clearTimeout(updateTimeout);
			updateTimeout = setTimeout(async () => {
				await goto(`?${params.toString()}`, { replaceState: true });
			}, 300);
		} finally {
			isLoading = false;
		}
	}

	// Watch for filter changes
	$effect(() => {
		if (isInitialized) {
			const { start, end } = dateRange;
			const accounts = selectedAccounts;
			updateURL();
		}
	});

	function handleAccountSelection(accountId: number) {
		if (!selectedAccounts.includes(accountId)) {
			selectedAccounts = [...selectedAccounts, accountId];
		}
		searchQuery = '';
		showDropdown = false;
	}

	function removeAccount(accountId: number) {
		selectedAccounts = selectedAccounts.filter((id) => id !== accountId);
	}

	function handleDateRangeChange(event: CustomEvent<{ start: string; end: string }>) {
		dateRange = event.detail;
	}

	async function handlePdfExport() {
		const exportData = {
			summaryData: data.summaryData.map((account) => ({
				accountId: account.accountId,
				accountCode: account.accountCode,
				accountName: account.accountName,
				beginningBalance: account.beginningBalance,
				changeDebit: account.changeDebit,
				changeCredit: account.changeCredit,
				netChange: account.netChange,
				endingBalance: account.endingBalance
			})),
			totals: {
				beginningBalance: data.totals.beginningBalance,
				changeDebit: data.totals.changeDebit,
				changeCredit: data.totals.changeCredit,
				netChange: data.totals.netChange,
				endingBalance: data.totals.endingBalance
			}
		};

		await exportGLSummaryToPdf(exportData, dateRange);
	}

	async function handleExcelExport() {
		const exportData = {
			summaryData: data.summaryData.map((account) => ({
				accountId: account.accountId,
				accountCode: account.accountCode,
				accountName: account.accountName,
				beginningBalance: account.beginningBalance,
				changeDebit: account.changeDebit,
				changeCredit: account.changeCredit,
				netChange: account.netChange,
				endingBalance: account.endingBalance
			})),
			totals: {
				beginningBalance: data.totals.beginningBalance,
				changeDebit: data.totals.changeDebit,
				changeCredit: data.totals.changeCredit,
				netChange: data.totals.netChange,
				endingBalance: data.totals.endingBalance
			}
		};

		await exportGLSummaryToExcel(exportData, dateRange);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">General Ledger Summary</h1>
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

	<div class="space-y-4 print:hidden">
		<ReportFilters {dateRange} onchange={handleDateRangeChange} />

		<div class="form-control w-full">
			<label class="label" for="account-search">
				<span class="label-text">Search Accounts</span>
			</label>

			<div class="relative" bind:this={searchContainer}>
				<input
					type="text"
					id="account-search"
					class="input input-bordered w-full"
					placeholder="Search by account code or name..."
					bind:value={searchQuery}
					onfocus={() => (showDropdown = true)}
				/>

				{#if showDropdown && filteredAccounts.length > 0}
					<div
						class="bg-base-100 absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border shadow-lg"
					>
						{#each filteredAccounts as account}
							<button
								class="hover:bg-base-200 flex w-full items-center space-x-2 px-4 py-2 text-left"
								onclick={() => handleAccountSelection(account.id)}
							>
								<span class="font-mono">{account.code}</span>
								<span>- {account.name}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			{#if selectedAccountDetails.length > 0}
				<div class="mt-2 flex flex-wrap gap-2">
					{#each selectedAccountDetails as account}
						<div class="badge badge-lg gap-2">
							<span class="font-mono">{account.code} - {account.name}</span>
							<button class="btn btn-ghost btn-xs px-1" onclick={() => removeAccount(account.id)}>
								✕
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table-zebra table-sm table w-full">
				<thead>
					<tr>
						<th>Account</th>
						<th>Account Name</th>
						<th class="text-right">Beginning Balance</th>
						<th class="text-right">Change Debit</th>
						<th class="text-right">Change Credit</th>
						<th class="text-right">Net Change</th>
						<th class="text-right">Ending Balance</th>
					</tr>
				</thead>
				<tbody>
					{#each data.summaryData as row}
						<tr>
							<td class="font-mono">{row.accountCode}</td>
							<td>{row.accountName}</td>
							<td class="text-right">{formatCurrencyWithDecimals(row.beginningBalance)}</td>
							<td class="text-right">{formatCurrencyWithDecimals(row.changeDebit)}</td>
							<td class="text-right">{formatCurrencyWithDecimals(row.changeCredit)}</td>
							<td class="text-right">
								<span
									class={row.netChange > 0 ? 'text-success' : row.netChange < 0 ? 'text-error' : ''}
								>
									{formatCurrencyWithDecimals(row.netChange)}
								</span>
							</td>
							<td class="text-right">{formatCurrencyWithDecimals(row.endingBalance)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="text-lg font-bold">
						<td colspan="2">Total</td>
						<td class="text-right">{formatCurrencyWithDecimals(data.totals.beginningBalance)}</td>
						<td class="text-right">{formatCurrencyWithDecimals(data.totals.changeDebit)}</td>
						<td class="text-right">{formatCurrencyWithDecimals(data.totals.changeCredit)}</td>
						<td class="text-right">
							<span
								class={data.totals.netChange > 0
									? 'text-success'
									: data.totals.netChange < 0
										? 'text-error'
										: ''}
							>
								{formatCurrencyWithDecimals(data.totals.netChange)}
							</span>
						</td>
						<td class="text-right">{formatCurrencyWithDecimals(data.totals.endingBalance)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	{/if}
</div>
