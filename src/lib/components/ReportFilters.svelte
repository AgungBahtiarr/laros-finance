<!-- src/routes/(authenticated)/gl/ledger/reports/ReportFilters.svelte -->
<script lang="ts">
	import type { DateRange } from '$lib/types';

	interface Props {
		dateRange: DateRange;
		showAccountSelector?: boolean;
		showCompareOption?: boolean;
		showPercentages?: boolean;
		includeSubAccounts?: boolean;
		selectedAccounts?: string[];
		compareWithPrevious?: boolean;
		showPercentagesOption?: boolean;
	}

	let {
		dateRange = $bindable(),
		showAccountSelector = false,
		showCompareOption = false,
		showPercentages = $bindable(false),
		includeSubAccounts = $bindable(true),
		selectedAccounts = $bindable([]),
		compareWithPrevious = $bindable(false),
		showPercentagesOption = false
	}: Props = $props();

	let startDate = $state(dateRange.start);
	let endDate = $state(dateRange.end);

	$effect(() => {
		startDate = dateRange.start;
		endDate = dateRange.end;
	});

	function updateDateRange() {
		dateRange.start = startDate;
		dateRange.end = endDate;
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap gap-4">
		<div class="form-control">
			<label class="label" for="start-date">
				<span class="label-text">Start Date</span>
			</label>
			<input
				id="start-date"
				type="date"
				class="input input-bordered"
				bind:value={startDate}
				onchange={updateDateRange}
			/>
		</div>

		<div class="form-control">
			<label class="label" for="end-date">
				<span class="label-text">End Date</span>
			</label>
			<input
				id="end-date"
				type="date"
				class="input input-bordered"
				bind:value={endDate}
				onchange={updateDateRange}
			/>
		</div>

		{#if showAccountSelector}
			<div class="form-control">
				<label class="label" for="accounts-select">
					<span class="label-text">Accounts</span>
				</label>
				<select id="accounts-select" class="select select-bordered" multiple bind:value={selectedAccounts}>
					<!-- TODO: Add account options -->
				</select>
			</div>

			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">Include Sub-accounts</span>
					<input type="checkbox" class="checkbox" bind:checked={includeSubAccounts} />
				</label>
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap gap-4">
		{#if showCompareOption}
			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">Compare with Previous Period</span>
					<input type="checkbox" class="checkbox" bind:checked={compareWithPrevious} />
				</label>
			</div>
		{/if}

		{#if showPercentagesOption}
			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">Show Percentages</span>
					<input type="checkbox" class="checkbox" bind:checked={showPercentages} />
				</label>
			</div>
		{/if}
	</div>
</div>