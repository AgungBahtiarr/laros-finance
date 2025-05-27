<!-- src/routes/(authenticated)/gl/ledger/reports/profit-loss/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import ReportFilters from '$lib/components/ReportFilters.svelte';
	import { formatCurrency, calculatePercentage, calculateChange } from '$lib/utils.client';

	let { data } = $props();
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
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Profit & Loss Statement</h1>
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

	<div class="overflow-x-auto">
		<table class="table-zebra table w-full">
			<thead>
				<tr>
					<th>Account</th>
					<th class="text-right">Current Period</th>
					{#if showPercentages}
						<th class="text-right">% of Revenue</th>
					{/if}
					{#if compareWithPrevious}
						<th class="text-right">Previous Period</th>
						{#if showPercentages}
							<th class="text-right">% of Revenue</th>
						{/if}
						<th class="text-right">Change</th>
					{/if}
				</tr>
			</thead>

			<tbody>
				<!-- Revenues -->
				<tr class="bg-base-200 font-bold">
					<td
						colspan={2 +
							(showPercentages ? 1 : 0) +
							(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
					>
						Revenues
					</td>
				</tr>

				{#if data.revenues && data.revenues.length > 0}
					{#each data.revenues as revenue}
						<tr>
							<td class="pl-{revenue.level * 4}">{revenue.name}</td>
							<td class="text-right">{formatCurrency(revenue.balance || 0)}</td>
							{#if showPercentages}
								<td class="text-right">
									{calculatePercentage(revenue.balance || 0, data.revenueTotals?.balance || 0)}
								</td>
							{/if}
							{#if compareWithPrevious && data.previousPeriod}
								{@const prevRevenue = data.previousPeriod.revenues?.find(
									(r) => r.id === revenue.id
								)}
								<td class="text-right">
									{prevRevenue ? formatCurrency(prevRevenue.balance || 0) : '-'}
								</td>
								{#if showPercentages}
									<td class="text-right">
										{prevRevenue
											? calculatePercentage(
													prevRevenue.balance || 0,
													data.previousPeriod.revenues?.reduce(
														(sum, r) => sum + (r.balance || 0),
														0
													) || 0
												)
											: '-'}
									</td>
								{/if}
								<td class="text-right">
									{#if prevRevenue}
										{@const change = calculateChange(
											revenue.balance || 0,
											prevRevenue.balance || 0
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
							No revenue data found for the selected period
						</td>
					</tr>
				{/if}

				<!-- Revenue Total -->
				<tr class="font-bold">
					<td>Total Revenues</td>
					<td class="text-right">{formatCurrency(data.revenueTotals?.balance || 0)}</td>
					{#if showPercentages}
						<td class="text-right">100%</td>
					{/if}
					{#if compareWithPrevious && data.previousPeriod}
						{@const prevTotal =
							data.previousPeriod.revenues?.reduce((sum, r) => sum + (r.balance || 0), 0) || 0}
						{@const change = calculateChange(data.revenueTotals?.balance || 0, prevTotal)}
						<td class="text-right">{formatCurrency(prevTotal)}</td>
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

				<!-- Expenses -->
				<tr class="bg-base-200 font-bold">
					<td
						colspan={2 +
							(showPercentages ? 1 : 0) +
							(compareWithPrevious ? (showPercentages ? 3 : 2) : 0)}
					>
						Expenses
					</td>
				</tr>

				{#if data.expenses && data.expenses.length > 0}
					{#each data.expenses as expense}
						<tr>
							<td class="pl-{expense.level * 4}">{expense.name}</td>
							<td class="text-right">{formatCurrency(expense.balance || 0)}</td>
							{#if showPercentages}
								<td class="text-right">
									{calculatePercentage(expense.balance || 0, data.revenueTotals?.balance || 0)}
								</td>
							{/if}
							{#if compareWithPrevious && data.previousPeriod}
								{@const prevExpense = data.previousPeriod.expenses?.find(
									(e) => e.id === expense.id
								)}
								<td class="text-right">
									{prevExpense ? formatCurrency(prevExpense.balance || 0) : '-'}
								</td>
								{#if showPercentages}
									<td class="text-right">
										{prevExpense
											? calculatePercentage(
													prevExpense.balance || 0,
													data.previousPeriod.revenues?.reduce(
														(sum, r) => sum + (r.balance || 0),
														0
													) || 0
												)
											: '-'}
									</td>
								{/if}
								<td class="text-right">
									{#if prevExpense}
										{@const change = calculateChange(
											expense.balance || 0,
											prevExpense.balance || 0
										)}
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
							No expense data found for the selected period
						</td>
					</tr>
				{/if}

				<!-- Expense Total -->
				<tr class="font-bold">
					<td>Total Expenses</td>
					<td class="text-right">{formatCurrency(data.expenseTotals?.balance || 0)}</td>
					{#if showPercentages}
						<td class="text-right">
							{calculatePercentage(
								data.expenseTotals?.balance || 0,
								data.revenueTotals?.balance || 0
							)}
						</td>
					{/if}
					{#if compareWithPrevious && data.previousPeriod}
						{@const prevTotal =
							data.previousPeriod.expenses?.reduce((sum, e) => sum + (e.balance || 0), 0) || 0}
						{@const change = calculateChange(data.expenseTotals?.balance || 0, prevTotal)}
						<td class="text-right">{formatCurrency(prevTotal)}</td>
						{#if showPercentages}
							<td class="text-right">
								{calculatePercentage(
									prevTotal,
									data.previousPeriod.revenues?.reduce((sum, r) => sum + (r.balance || 0), 0) || 0
								)}
							</td>
						{/if}
						<td class="text-right">
							<span
								class={change.value > 0 ? 'text-error' : change.value < 0 ? 'text-success' : ''}
							>
								{change.display}
							</span>
						</td>
					{/if}
				</tr>

				<!-- Net Income -->
				<tr class="text-lg font-bold">
					<td>Net Income</td>
					<td class="text-right">{formatCurrency(data.netIncome || 0)}</td>
					{#if showPercentages}
						<td class="text-right">
							{calculatePercentage(data.netIncome || 0, data.revenueTotals?.balance || 0)}
						</td>
					{/if}
					{#if compareWithPrevious && data.previousPeriod}
						{@const change = calculateChange(
							data.netIncome || 0,
							data.previousPeriod.netIncome || 0
						)}
						<td class="text-right">{formatCurrency(data.previousPeriod.netIncome || 0)}</td>
						{#if showPercentages}
							<td class="text-right">
								{calculatePercentage(
									data.previousPeriod.netIncome || 0,
									data.previousPeriod.revenues?.reduce((sum, r) => sum + (r.balance || 0), 0) || 0
								)}
							</td>
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
			<span>
				No journal entries found for the selected period. Make sure you have posted journal entries
				with revenue and expense accounts for the date range: {dateRange.start} to {dateRange.end}.
			</span>
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
