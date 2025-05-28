<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency, calculatePercentage, calculateChange } from '$lib/utils/utils.client';

	let { data } = $props();

	let dateRange = $state({
		start: new Date().toISOString().split('T')[0],
		end: new Date().toISOString().split('T')[0]
	});

	let compareWithPrevious = $state(false);
	let showPercentages = $state(false);

	// Initialize values from URL params on client-side only
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
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Account Balance</h1>
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
					<th class="text-right">Debit</th>
					<th class="text-right">Credit</th>
					<th class="text-right">Balance</th>
					{#if showPercentages}
						<th class="text-right">% of Total</th>
					{/if}
					{#if compareWithPrevious}
						<th class="text-right">Previous Balance</th>
						{#if showPercentages}
							<th class="text-right">% of Total</th>
						{/if}
						<th class="text-right">Change</th>
					{/if}
				</tr>
			</thead>

			<tbody>
				{#each sortedAccounts as account}
					<tr>
						<td class="pl-{account.level * 4}">
							<span class="font-mono">{account.code}</span> - {account.name}
						</td>
						<td>{account.type}</td>
						<td class="text-right">{formatCurrency(account.debit)}</td>
						<td class="text-right">{formatCurrency(account.credit)}</td>
						<td class="text-right">
							<span
								class={account.balance > 0
									? account.type === 'ASSET' || account.type === 'EXPENSE'
										? 'text-success'
										: 'text-error'
									: account.type === 'ASSET' || account.type === 'EXPENSE'
										? 'text-error'
										: 'text-success'}
							>
								{formatCurrency(Math.abs(account.balance))}
							</span>
						</td>
						{#if showPercentages}
							<td class="text-right">
								{calculatePercentage(Math.abs(account.balance), Math.abs(data.totals.balance))}
							</td>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{#if true}
								{@const prevAccount = data.previousPeriod.accounts.find((a) => a.id === account.id)}
								<td class="text-right">
									{prevAccount ? formatCurrency(Math.abs(prevAccount.balance)) : '-'}
								</td>
								{#if showPercentages}
									<td class="text-right">
										{prevAccount
											? calculatePercentage(
													Math.abs(prevAccount.balance),
													Math.abs(data.previousPeriod.totals.balance)
												)
											: '-'}
									</td>
								{/if}
								<td class="text-right">
									{#if prevAccount}
										{@const change = calculateChange(account.balance, prevAccount.balance)}
										<span
											class={change.value > 0
												? account.type === 'ASSET' || account.type === 'EXPENSE'
													? 'text-success'
													: 'text-error'
												: account.type === 'ASSET' || account.type === 'EXPENSE'
													? 'text-error'
													: 'text-success'}
										>
											{change.display}
										</span>
									{:else}
										-
									{/if}
								</td>
							{/if}
						{/if}
					</tr>
				{/each}

				<!-- Totals -->
				<tr class="text-lg font-bold">
					<td colspan="2">Total</td>
					<td class="text-right">{formatCurrency(data.totals.debit)}</td>
					<td class="text-right">{formatCurrency(data.totals.credit)}</td>
					<td class="text-right">{formatCurrency(Math.abs(data.totals.balance))}</td>
					{#if showPercentages}
						<td class="text-right">100%</td>
					{/if}
					{#if compareWithPrevious && data.previousPeriod}
						{#if true}
							{@const change = calculateChange(
								data.totals.balance,
								data.previousPeriod.totals.balance
							)}
							<td class="text-right">
								{formatCurrency(Math.abs(data.previousPeriod.totals.balance))}
							</td>
							{#if showPercentages}
								<td class="text-right">100%</td>
							{/if}
							<td class="text-right">
								<span
									class={change.value > 0 ? 'text-success' : change.value < 0 ? 'text-error' : ''}
								>
									{change.display}
								</span>
							</td>
						{/if}
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
