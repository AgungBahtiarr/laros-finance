<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency } from '$lib/utils/utils.client';
	import { onMount } from 'svelte';

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

	let currentPage = $state(data.pagination.currentPage);
	let totalPages = $derived(data.pagination.totalPages);

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
			const page = searchParams.get('page');
			const accounts = searchParams.get('accounts');

			if (startDate) dateRange.start = startDate;
			if (endDate) dateRange.end = endDate;
			if (page) currentPage = Number(page);
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
			params.set('page', currentPage.toString());
			if (selectedAccounts.length > 0) {
				params.set('accounts', selectedAccounts.join(','));
			}

			clearTimeout(updateTimeout);
			updateTimeout = setTimeout(async () => {
				await goto(`?${params.toString()}`, { replaceState: true });
			}, 300); // Debounce URL updates
		} finally {
			isLoading = false;
		}
	}

	// Watch for filter changes
	$effect(() => {
		if (isInitialized) {
			const { start, end } = dateRange;
			const accounts = selectedAccounts;
			const page = currentPage;
			updateURL();
		}
	});

	function handleAccountSelection(accountId: number) {
		if (!selectedAccounts.includes(accountId)) {
			selectedAccounts = [...selectedAccounts, accountId];
			currentPage = 1; // Reset to first page when filter changes
		}
		searchQuery = '';
		showDropdown = false;
	}

	function removeAccount(accountId: number) {
		selectedAccounts = selectedAccounts.filter((id) => id !== accountId);
		currentPage = 1; // Reset to first page when filter changes
	}

	function changePage(newPage: number) {
		if (newPage >= 1 && newPage <= totalPages) {
			currentPage = newPage;
		}
	}

	function handleDateRangeChange(event: CustomEvent<{ start: string; end: string }>) {
		dateRange = event.detail;
		currentPage = 1; // Reset to first page when date range changes
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">General Ledger Summary</h1>
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

	<div class="print:hidden space-y-4">
		<ReportFilters {dateRange} on:change={handleDateRangeChange} />

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
						class="absolute z-50 mt-1 w-full bg-base-100 rounded-lg border shadow-lg max-h-60 overflow-y-auto"
					>
						{#each filteredAccounts as account}
							<button
								class="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center space-x-2"
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
		<div class="flex justify-center items-center py-8">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
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
							<td class="text-right">{formatCurrency(row.beginningBalance)}</td>
							<td class="text-right">{formatCurrency(row.changeDebit)}</td>
							<td class="text-right">{formatCurrency(row.changeCredit)}</td>
							<td class="text-right">
								<span
									class={row.netChange > 0 ? 'text-success' : row.netChange < 0 ? 'text-error' : ''}
								>
									{formatCurrency(row.netChange)}
								</span>
							</td>
							<td class="text-right">{formatCurrency(row.endingBalance)}</td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr class="text-lg font-bold">
						<td colspan="2">Total</td>
						<td class="text-right">{formatCurrency(data.totals.beginningBalance)}</td>
						<td class="text-right">{formatCurrency(data.totals.changeDebit)}</td>
						<td class="text-right">{formatCurrency(data.totals.changeCredit)}</td>
						<td class="text-right">
							<span
								class={data.totals.netChange > 0
									? 'text-success'
									: data.totals.netChange < 0
										? 'text-error'
										: ''}
							>
								{formatCurrency(data.totals.netChange)}
							</span>
						</td>
						<td class="text-right">{formatCurrency(data.totals.endingBalance)}</td>
					</tr>
				</tfoot>
			</table>

			{#if data.pagination.totalPages > 1}
				<div class="flex justify-center items-center gap-2 mt-4 print:hidden">
					<button class="btn btn-sm" disabled={currentPage === 1} onclick={() => changePage(1)}>
						«
					</button>
					<button
						class="btn btn-sm"
						disabled={currentPage === 1}
						onclick={() => changePage(currentPage - 1)}
					>
						‹
					</button>

					<span class="mx-2">
						Page {currentPage} of {totalPages}
						({data.pagination.totalItems} items)
					</span>

					<button
						class="btn btn-sm"
						disabled={currentPage === totalPages}
						onclick={() => changePage(currentPage + 1)}
					>
						›
					</button>
					<button
						class="btn btn-sm"
						disabled={currentPage === totalPages}
						onclick={() => changePage(totalPages)}
					>
						»
					</button>
				</div>
			{/if}
		</div>
	{/if}
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
