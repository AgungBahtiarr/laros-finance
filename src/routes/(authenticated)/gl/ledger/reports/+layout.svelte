<!-- src/routes/(authenticated)/gl/ledger/reports/+layout.svelte -->
<script lang="ts">
	let { children } = $props();
</script>

<div class="flex flex-col gap-4">
	<div class="bg-base-100 rounded-box p-4 shadow-lg">
		<h2 class="mb-4 text-2xl font-bold">Financial Reports</h2>
		<div class="tabs tabs-boxed">
			<a href="/gl/ledger/reports/profit-loss" class="tab" data-sveltekit-preload-data
				>Profit & Loss</a
			>
			<a href="/gl/ledger/reports/balance-sheet" class="tab" data-sveltekit-preload-data
				>Balance Sheet</a
			>
			<a href="/gl/ledger/reports/trial-balance" class="tab" data-sveltekit-preload-data
				>Trial Balance</a
			>
			<a href="/gl/ledger/reports/account-balance" class="tab" data-sveltekit-preload-data
				>Account Balance</a
			>
			<a href="/gl/ledger/reports/journal" class="tab" data-sveltekit-preload-data>Journal</a>
			<a href="/gl/ledger/reports/gl-summary" class="tab" data-sveltekit-preload-data>GL Summary</a>
			<a href="/gl/ledger/reports/gl-detail" class="tab" data-sveltekit-preload-data>GL Detail</a>
		</div>
	</div>

	<div class="bg-base-100 rounded-box p-4 shadow-lg">
		{@render children()}
	</div>
</div>
