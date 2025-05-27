<!-- src/routes/(authenticated)/gl/ledger/reports/balance-sheet/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency, calculatePercentage, calculateChange } from '$lib/utils.client';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
	console.log(data);

	let compareWithPrevious = $state(false);
	let showPercentages = $state(false);

	// Initialize dateRange
	const defaultDate = new Date().toISOString().split('T')[0];
	let dateRange = $state({
		start: defaultDate,
		end: defaultDate
	});

	// Initialize state from URL params on client-side only
	$effect(() => {
		if (browser) {
			const searchParams = new URLSearchParams(window.location.search);
			dateRange.start = searchParams.get('startDate') || defaultDate;
			dateRange.end = searchParams.get('endDate') || defaultDate;
			compareWithPrevious = searchParams.get('compareWithPrevious') === 'true';
			showPercentages = searchParams.get('showPercentages') === 'true';
		}
	});

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

	let totalAktiva = $derived(data.totalAktiva?.balance || 0);
	let totalPasiva = $derived(data.totalPasiva?.balance || 0);
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Neraca (Balance Sheet)</h1>
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
			bind:dateRange
			showCompareOption={true}
			showPercentagesOption={true}
			bind:compareWithPrevious
			bind:showPercentages
		/>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Aktiva -->
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Aktiva (Assets)</th>
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
					<!-- Aktiva Lancar -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Aktiva Lancar (Current Assets)
						</td>
					</tr>

					{#if data.aktivaLancar && data.aktivaLancar.length > 0}
						{#each data.aktivaLancar as asset}
							<tr>
								<td class="pl-{asset.level * 4}">{asset.name}</td>
								<td class="text-right">{formatCurrency(asset.balance || 0)}</td>
								{#if showPercentages}
									<td class="text-right">{calculatePercentage(asset.balance || 0, totalAktiva)}</td>
								{/if}
								{#if compareWithPrevious && data.previousPeriod}
									{@const prevAsset = data.previousPeriod.aktivaLancar?.find(
										(a) => a.id === asset.id
									)}
									<td class="text-right">
										{prevAsset ? formatCurrency(prevAsset.balance || 0) : '-'}
									</td>
									{#if showPercentages}
										<td class="text-right">
											{prevAsset
												? calculatePercentage(
														prevAsset.balance || 0,
														data.previousPeriod.aktivaLancar.reduce(
															(sum, a) => sum + (a.balance || 0),
															0
														)
													)
												: '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevAsset}
											{@const change = calculateChange(asset.balance || 0, prevAsset.balance || 0)}
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
							</tr>
						{/each}
					{:else}
						<tr>
							<td
								colspan={2 +
									(showPercentages ? 1 : 0) +
									(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
								class="text-center text-gray-500"
							>
								No current assets found for the selected period
							</td>
						</tr>
					{/if}

					<!-- Aktiva Tetap -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Aktiva Tetap (Fixed Assets)
						</td>
					</tr>

					{#if data.aktivaTetap && data.aktivaTetap.length > 0}
						{#each data.aktivaTetap as asset}
							<tr>
								<td class="pl-{asset.level * 4}">{asset.name}</td>
								<td class="text-right">{formatCurrency(asset.balance || 0)}</td>
								{#if showPercentages}
									<td class="text-right">{calculatePercentage(asset.balance || 0, totalAktiva)}</td>
								{/if}
								{#if compareWithPrevious && data.previousPeriod}
									{@const prevAsset = data.previousPeriod.aktivaTetap?.find(
										(a) => a.id === asset.id
									)}
									<td class="text-right">
										{prevAsset ? formatCurrency(prevAsset.balance || 0) : '-'}
									</td>
									{#if showPercentages}
										<td class="text-right">
											{prevAsset
												? calculatePercentage(
														prevAsset.balance || 0,
														data.previousPeriod.aktivaTetap.reduce(
															(sum, a) => sum + (a.balance || 0),
															0
														)
													)
												: '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevAsset}
											{@const change = calculateChange(asset.balance || 0, prevAsset.balance || 0)}
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
							</tr>
						{/each}
					{:else}
						<tr>
							<td
								colspan={2 +
									(showPercentages ? 1 : 0) +
									(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
								class="text-center text-gray-500"
							>
								No fixed assets found for the selected period
							</td>
						</tr>
					{/if}

					<!-- Aktiva Lainnya -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Aktiva Lainnya (Other Assets)
						</td>
					</tr>

					{#if data.aktivaLainnya && data.aktivaLainnya.length > 0}
						{#each data.aktivaLainnya as asset}
							<tr>
								<td class="pl-{asset.level * 4}">{asset.name}</td>
								<td class="text-right">{formatCurrency(asset.balance || 0)}</td>
								{#if showPercentages}
									<td class="text-right">{calculatePercentage(asset.balance || 0, totalAktiva)}</td>
								{/if}
								{#if compareWithPrevious && data.previousPeriod}
									{@const prevAsset = data.previousPeriod.aktivaLainnya?.find(
										(a) => a.id === asset.id
									)}
									<td class="text-right">
										{prevAsset ? formatCurrency(prevAsset.balance || 0) : '-'}
									</td>
									{#if showPercentages}
										<td class="text-right">
											{prevAsset
												? calculatePercentage(
														prevAsset.balance || 0,
														data.previousPeriod.aktivaLainnya.reduce(
															(sum, a) => sum + (a.balance || 0),
															0
														)
													)
												: '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevAsset}
											{@const change = calculateChange(asset.balance || 0, prevAsset.balance || 0)}
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
							</tr>
						{/each}
					{:else}
						<tr>
							<td
								colspan={2 +
									(showPercentages ? 1 : 0) +
									(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
								class="text-center text-gray-500"
							>
								No other assets found for the selected period
							</td>
						</tr>
					{/if}

					<!-- Total Aktiva -->
					<tr class="font-bold">
						<td>Total Aktiva</td>
						<td class="text-right">{formatCurrency(totalAktiva)}</td>
						{#if showPercentages}
							<td class="text-right">100%</td>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{@const prevTotalAktiva = [
								...data.previousPeriod.aktivaLancar,
								...data.previousPeriod.aktivaTetap,
								...data.previousPeriod.aktivaLainnya
							].reduce((sum, a) => sum + (a.balance || 0), 0)}
							{@const change = calculateChange(totalAktiva, prevTotalAktiva)}
							<td class="text-right">{formatCurrency(prevTotalAktiva)}</td>
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
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Pasiva -->
		<div class="overflow-x-auto">
			<table class="table-zebra table w-full">
				<thead>
					<tr>
						<th>Pasiva (Liabilities & Equity)</th>
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
					<!-- Hutang Lancar -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Hutang Lancar (Current Liabilities)
						</td>
					</tr>

					{#if data.hutangLancar && data.hutangLancar.length > 0}
						{#each data.hutangLancar as liability}
							<tr>
								<td class="pl-{liability.level * 4}">{liability.name}</td>
								<td class="text-right">{formatCurrency(liability.balance || 0)}</td>
								{#if showPercentages}
									<td class="text-right">
										{calculatePercentage(liability.balance || 0, totalPasiva)}
									</td>
								{/if}
								{#if compareWithPrevious && data.previousPeriod}
									{@const prevLiability = data.previousPeriod.hutangLancar?.find(
										(l) => l.id === liability.id
									)}
									<td class="text-right">
										{prevLiability ? formatCurrency(prevLiability.balance || 0) : '-'}
									</td>
									{#if showPercentages}
										<td class="text-right">
											{prevLiability
												? calculatePercentage(
														prevLiability.balance || 0,
														data.previousPeriod.hutangLancar.reduce(
															(sum, l) => sum + (l.balance || 0),
															0
														)
													)
												: '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevLiability}
											{@const change = calculateChange(
												liability.balance || 0,
												prevLiability.balance || 0
											)}
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
							</tr>
						{/each}
					{:else}
						<tr>
							<td
								colspan={2 +
									(showPercentages ? 1 : 0) +
									(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
								class="text-center text-gray-500"
							>
								No current liabilities found for the selected period
							</td>
						</tr>
					{/if}

					<!-- Hutang Jangka Panjang -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Hutang Jangka Panjang (Long-term Liabilities)
						</td>
					</tr>

					{#if data.hutangJangkaPanjang && data.hutangJangkaPanjang.length > 0}
						{#each data.hutangJangkaPanjang as liability}
							<tr>
								<td class="pl-{liability.level * 4}">{liability.name}</td>
								<td class="text-right">{formatCurrency(liability.balance || 0)}</td>
								{#if showPercentages}
									<td class="text-right">
										{calculatePercentage(liability.balance || 0, totalPasiva)}
									</td>
								{/if}
								{#if compareWithPrevious && data.previousPeriod}
									{@const prevLiability = data.previousPeriod.hutangJangkaPanjang?.find(
										(l) => l.id === liability.id
									)}
									<td class="text-right">
										{prevLiability ? formatCurrency(prevLiability.balance || 0) : '-'}
									</td>
									{#if showPercentages}
										<td class="text-right">
											{prevLiability
												? calculatePercentage(
														prevLiability.balance || 0,
														data.previousPeriod.hutangJangkaPanjang.reduce(
															(sum, l) => sum + (l.balance || 0),
															0
														)
													)
												: '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevLiability}
											{@const change = calculateChange(
												liability.balance || 0,
												prevLiability.balance || 0
											)}
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
							</tr>
						{/each}
					{:else}
						<tr>
							<td
								colspan={2 +
									(showPercentages ? 1 : 0) +
									(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
								class="text-center text-gray-500"
							>
								No long-term liabilities found for the selected period
							</td>
						</tr>
					{/if}

					<!-- Modal -->
					<tr class="bg-base-200 font-bold">
						<td
							colspan={2 +
								(showPercentages ? 1 : 0) +
								(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
						>
							Modal (Equity)
						</td>
					</tr>

					{#if data.modal && data.modal.length > 0}
						{#each data.modal as equity}
							<tr>
								<td class="pl-{equity.level * 4}">{equity.name}</td>
								<td class="text-right">{formatCurrency(equity.balance || 0)}</td>
								{#if showPercentages}
									<td class="text-right">
										{calculatePercentage(equity.balance || 0, totalPasiva)}
									</td>
								{/if}
								{#if compareWithPrevious && data.previousPeriod}
									{@const prevEquity = data.previousPeriod.modal?.find((e) => e.id === equity.id)}
									<td class="text-right">
										{prevEquity ? formatCurrency(prevEquity.balance || 0) : '-'}
									</td>
									{#if showPercentages}
										<td class="text-right">
											{prevEquity
												? calculatePercentage(
														prevEquity.balance || 0,
														data.previousPeriod.modal.reduce((sum, e) => sum + (e.balance || 0), 0)
													)
												: '-'}
										</td>
									{/if}
									<td class="text-right">
										{#if prevEquity}
											{@const change = calculateChange(
												equity.balance || 0,
												prevEquity.balance || 0
											)}
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
							</tr>
						{/each}
					{:else}
						<tr>
							<td
								colspan={2 +
									(showPercentages ? 1 : 0) +
									(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
								class="text-center text-gray-500"
							>
								No equity accounts found for the selected period
							</td>
						</tr>
					{/if}

					<!-- Total Pasiva -->
					<tr class="font-bold">
						<td>Total Pasiva</td>
						<td class="text-right">{formatCurrency(totalPasiva)}</td>
						{#if showPercentages}
							<td class="text-right">100%</td>
						{/if}
						{#if compareWithPrevious && data.previousPeriod}
							{@const prevTotalPasiva = [
								...data.previousPeriod.hutangLancar,
								...data.previousPeriod.hutangJangkaPanjang,
								...data.previousPeriod.modal
							].reduce((sum, p) => sum + (p.balance || 0), 0)}
							{@const change = calculateChange(totalPasiva, prevTotalPasiva)}
							<td class="text-right">{formatCurrency(prevTotalPasiva)}</td>
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
