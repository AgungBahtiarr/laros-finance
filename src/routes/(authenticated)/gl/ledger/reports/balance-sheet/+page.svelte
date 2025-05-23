<!-- src/routes/(authenticated)/gl/ledger/reports/balance-sheet/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency, calculatePercentage, calculateChange } from '$lib/utils.client';
	import type { PageData } from './$types';

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

	const totalAssets = data.assetTotals.balance;
	const totalLiabilitiesAndEquity = data.liabilityTotals.balance + data.equityTotals.balance;
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Balance Sheet</h1>
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

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Assets -->
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Assets</th>
						<th class="text-right">Amount</th>
						{#if showPercentages}
							<th class="text-right">% of Total</th>
						{/if}
						{#if compareWithPrevious}
							<th class="text-right">Previous Period</th>
							{#if showPercentages}
								<th class="text-right">% of Total</th>
							{/if}
							<th class="text-right">Change</th>
						{/if}
					</tr>
				</thead>

				<tbody>
					{#each data.assets as asset}
						<tr>
							<td class="pl-{asset.level * 4}">{asset.name}</td>
							<td class="text-right">{formatCurrency(asset.balance)}</td>
							{#if showPercentages}
								<td class="text-right">{calculatePercentage(asset.balance, totalAssets)}</td>
							{/if}
							{#if compareWithPrevious && data.previousPeriod}
								{#if true}
									{@const prevAsset = data.previousPeriod.assets.find((a) => a.id === asset.id)}
									{@const prevTotalAssets = data.previousPeriod.assets.reduce(
										(sum, a) => sum + a.balance,
										0
									)}
									<td class="text-right">{prevAsset ? formatCurrency(prevAsset.balance) : '-'}</td>
									{#if showPercentages}
										<td class="text-right">
											{prevAsset ? calculatePercentage(prevAsset.balance, prevTotalAssets) : '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevAsset}
											{@const change = calculateChange(asset.balance, prevAsset.balance)}
											<span
												class={change.value > 0
													? 'text-success'
													: change.value < 0
														? 'text-error'
														: ''}
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

					<!-- Total Assets -->
					<tr class="font-bold">
						<td>Total Assets</td>
						<td class="text-right">{formatCurrency(totalAssets)}</td>
						{#if showPercentages}
							<td class="text-right">100%</td>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{#if true}
								{@const prevTotalAssets = data.previousPeriod.assets.reduce(
									(sum, a) => sum + a.balance,
									0
								)}
								{@const change = calculateChange(totalAssets, prevTotalAssets)}
								<td class="text-right">{formatCurrency(prevTotalAssets)}</td>
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

		<!-- Liabilities and Equity -->
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Liabilities & Equity</th>
						<th class="text-right">Amount</th>
						{#if showPercentages}
							<th class="text-right">% of Total</th>
						{/if}
						{#if compareWithPrevious}
							<th class="text-right">Previous Period</th>
							{#if showPercentages}
								<th class="text-right">% of Total</th>
							{/if}
							<th class="text-right">Change</th>
						{/if}
					</tr>
				</thead>

				<tbody>
					<!-- Liabilities -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Liabilities
						</td>
					</tr>

					{#each data.liabilities as liability}
						<tr>
							<td class="pl-{liability.level * 4}">{liability.name}</td>
							<td class="text-right">{formatCurrency(liability.balance)}</td>
							{#if showPercentages}
								<td class="text-right"
									>{calculatePercentage(liability.balance, totalLiabilitiesAndEquity)}</td
								>
							{/if}
							{#if compareWithPrevious && data.previousPeriod}
								{#if true}
									{@const prevLiability = data.previousPeriod.liabilities.find(
										(l) => l.id === liability.id
									)}
									{@const prevTotal =
										data.previousPeriod.liabilities.reduce((sum, l) => sum + l.balance, 0) +
										data.previousPeriod.equity.reduce((sum, e) => sum + e.balance, 0)}
									<td class="text-right"
										>{prevLiability ? formatCurrency(prevLiability.balance) : '-'}</td
									>
									{#if showPercentages}
										<td class="text-right">
											{prevLiability ? calculatePercentage(prevLiability.balance, prevTotal) : '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevLiability}
											{@const change = calculateChange(liability.balance, prevLiability.balance)}
											<span
												class={change.value > 0
													? 'text-error'
													: change.value < 0
														? 'text-success'
														: ''}
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

					<!-- Total Liabilities -->
					<tr class="font-bold">
						<td>Total Liabilities</td>
						<td class="text-right">{formatCurrency(data.liabilityTotals.balance)}</td>
						{#if showPercentages}
							<td class="text-right"
								>{calculatePercentage(data.liabilityTotals.balance, totalLiabilitiesAndEquity)}</td
							>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{#if true}
								{@const prevTotal = data.previousPeriod.liabilities.reduce(
									(sum, l) => sum + l.balance,
									0
								)}
								{@const prevTotalWithEquity =
									prevTotal + data.previousPeriod.equity.reduce((sum, e) => sum + e.balance, 0)}
								{@const change = calculateChange(data.liabilityTotals.balance, prevTotal)}
								<td class="text-right">{formatCurrency(prevTotal)}</td>
								{#if showPercentages}
									<td class="text-right">{calculatePercentage(prevTotal, prevTotalWithEquity)}</td>
								{/if}
								<td class="text-right">
									<span
										class={change.value > 0 ? 'text-error' : change.value < 0 ? 'text-success' : ''}
									>
										{change.display}
									</span>
								</td>
							{/if}
						{/if}
					</tr>

					<!-- Equity -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Equity
						</td>
					</tr>

					{#each data.equity as equity}
						<tr>
							<td class="pl-{equity.level * 4}">{equity.name}</td>
							<td class="text-right">{formatCurrency(equity.balance)}</td>
							{#if showPercentages}
								<td class="text-right"
									>{calculatePercentage(equity.balance, totalLiabilitiesAndEquity)}</td
								>
							{/if}
							{#if compareWithPrevious && data.previousPeriod}
								{#if true}
									{@const prevEquity = data.previousPeriod.equity.find((e) => e.id === equity.id)}
									{@const prevTotal =
										data.previousPeriod.liabilities.reduce((sum, l) => sum + l.balance, 0) +
										data.previousPeriod.equity.reduce((sum, e) => sum + e.balance, 0)}
									<td class="text-right">{prevEquity ? formatCurrency(prevEquity.balance) : '-'}</td
									>
									{#if showPercentages}
										<td class="text-right">
											{prevEquity ? calculatePercentage(prevEquity.balance, prevTotal) : '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevEquity}
											{@const change = calculateChange(equity.balance, prevEquity.balance)}
											<span
												class={change.value > 0
													? 'text-success'
													: change.value < 0
														? 'text-error'
														: ''}
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

					<!-- Total Equity -->
					<tr class="font-bold">
						<td>Total Equity</td>
						<td class="text-right">{formatCurrency(data.equityTotals.balance)}</td>
						{#if showPercentages}
							<td class="text-right"
								>{calculatePercentage(data.equityTotals.balance, totalLiabilitiesAndEquity)}</td
							>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{#if true}
								{@const prevTotal = data.previousPeriod.equity.reduce(
									(sum, e) => sum + e.balance,
									0
								)}
								{@const prevTotalWithLiabilities =
									prevTotal +
									data.previousPeriod.liabilities.reduce((sum, l) => sum + l.balance, 0)}
								{@const change = calculateChange(data.equityTotals.balance, prevTotal)}
								<td class="text-right">{formatCurrency(prevTotal)}</td>
								{#if showPercentages}
									<td class="text-right"
										>{calculatePercentage(prevTotal, prevTotalWithLiabilities)}</td
									>
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

					<!-- Total Liabilities and Equity -->
					<tr class="text-lg font-bold">
						<td>Total Liabilities & Equity</td>
						<td class="text-right">{formatCurrency(totalLiabilitiesAndEquity)}</td>
						{#if showPercentages}
							<td class="text-right">100%</td>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{#if true}
								{@const prevTotal =
									data.previousPeriod.liabilities.reduce((sum, l) => sum + l.balance, 0) +
									data.previousPeriod.equity.reduce((sum, e) => sum + e.balance, 0)}
								{@const change = calculateChange(totalLiabilitiesAndEquity, prevTotal)}
								<td class="text-right">{formatCurrency(prevTotal)}</td>
								{#if showPercentages}
									<td class="text-right">100%</td>
								{/if}
								<td class="text-right">
									<span
										class={change.value > 0 ? 'text-error' : change.value < 0 ? 'text-success' : ''}
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
