<!-- src/routes/(authenticated)/gl/ledger/reports/ReportFilters.svelte -->
<script lang="ts">
	import type { DateRange } from '$lib/types';

	export let dateRange: DateRange;
	export let showAccountSelector = false;
	export let showCompareOption = false;
	export let showPercentages = false;
	export let includeSubAccounts = true;
	export let selectedAccounts: string[] = [];
	export let compareWithPrevious = false;
	export let showPercentagesOption = false;

	let startDate = dateRange.start;
	let endDate = dateRange.end;

	function updateDateRange() {
		dateRange = { start: startDate, end: endDate };
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap gap-4">
		<div class="form-control">
			<label class="label">
				<span class="label-text">Start Date</span>
			</label>
			<input
				type="date"
				class="input input-bordered"
				bind:value={startDate}
				on:change={updateDateRange}
			/>
		</div>

		<div class="form-control">
			<label class="label">
				<span class="label-text">End Date</span>
			</label>
			<input
				type="date"
				class="input input-bordered"
				bind:value={endDate}
				on:change={updateDateRange}
			/>
		</div>

		{#if showAccountSelector}
			<div class="form-control">
				<label class="label">
					<span class="label-text">Accounts</span>
				</label>
				<select class="select select-bordered" multiple bind:value={selectedAccounts}>
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
