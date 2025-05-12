<script lang="ts">
	import { goto } from '$app/navigation';
	import { BarChart, FileSpreadsheet, FileText, Calendar, Filter, RefreshCw } from '@lucide/svelte';

	// State for filters
	let startDate = $state('');
	let endDate = $state('');
	let reportType = $state('BALANCE_SHEET');
	let showFilters = $state(false);

	// Report types
	const reportTypes = [
		{ id: 'BALANCE_SHEET', name: 'Balance Sheet', icon: BarChart },
		{ id: 'INCOME_STATEMENT', name: 'Income Statement', icon: FileText },
		{ id: 'CASH_FLOW', name: 'Cash Flow Statement', icon: FileSpreadsheet }
	];

	// Apply filters
	function applyFilters() {
		const searchParams = new URLSearchParams();
		if (startDate) searchParams.set('startDate', startDate);
		if (endDate) searchParams.set('endDate', endDate);
		if (reportType) searchParams.set('type', reportType);
		goto(`?${searchParams.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		startDate = '';
		endDate = '';
		reportType = 'BALANCE_SHEET';
		goto('/gl/reports');
	}

	// Print report
	function printReport() {
		window.print();
	}

	// Create placeholder data for demo
	const currentDate = new Date().toLocaleDateString('id-ID', {
		day: '2-digit',
		month: 'long',
		year: 'numeric'
	});
</script>

<div class="space-y-6 print:space-y-4" id="report-container">
	<!-- Header -->
	<div class="flex flex-col justify-between gap-4 sm:flex-row print:flex-row
">
		<div>
			<h1 class="text-2xl font-bold text-gray-900 print:text-xl">Financial Reports</h1>
			<p class="text-sm text-gray-500">Generate and analyze financial statements</p>
		</div>
		<div class="flex gap-2 print:hidden">
			<button class="btn btn-outline btn-sm gap-1" onclick={() => (showFilters = !showFilters)}>
				<Filter class="h-4 w-4" />
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			</button>
			<button class="btn btn-outline btn-sm gap-1" onclick={printReport}>
				<FileSpreadsheet class="h-4 w-4" />
				Print
			</button>
		</div>
	</div>

	<!-- Filter Section -->
	{#if showFilters}
		<div class="card bg-base-100 border print:hidden">
			<div class="card-body p-4">
				<h2 class="card-title text-lg">Report Options</h2>
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div class="form-control w-full">
						<label class="label" for="reportType">
							<span class="label-text">Report Type</span>
						</label>
						<select id="reportType" class="select select-bordered w-full" bind:value={reportType}>
							{#each reportTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="startDate">
							<span class="label-text">As of Date</span>
						</label>
						<input
							type="date"
							id="startDate"
							class="input input-bordered w-full"
							bind:value={startDate}
						/>
					</div>

					<div class="form-control w-full">
						<label class="label" for="endDate">
							<span class="label-text">End Date</span>
							<span class="label-text-alt">For Income Statement</span>
						</label>
						<input
							type="date"
							id="endDate"
							class="input input-bordered w-full"
							bind:value={endDate}
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button class="btn btn-outline btn-sm gap-1" onclick={resetFilters}>
						<RefreshCw class="h-4 w-4" />
						Reset
					</button>
					<button class="btn btn-primary btn-sm" onclick={applyFilters}>Generate Report</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Report Content -->
	<div class="card bg-base-100 border p-6 print:border-none print:p-0">
		<!-- Report Header -->
		<div class="mb-6 text-center">
			<h2 class="text-2xl font-bol
d">PT Laros NDO</h2>
			<h3 class="text-xl font-semibold mt-2">
				{reportType === 'BALANCE_SHEET'
					? 'Balance Sheet'
					: reportType === 'INCOME_STATEMENT'
					? 'Income Statement'
					: 'Cash Flow Statement'}
			</h3>
			<p class="text-sm text-gray-600 mt-1">As of {currentDate}</p>
		</div>

		<!-- Report Body - Placeholder -->
		{#if reportType === 'BALANCE_SHEET'}
			<div class="space-y-4">
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Assets</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between">
							<span class="font-medium">Current Assets</span>
							<span></span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Cash and Cash Equivalents</span>
							<span class="font-mono">Rp 125,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Accounts Receivable</span>
							<span class="font-mono">Rp 75,500,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Inventory</span>
							<span class="font-mono">Rp 50,000,000</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Total Current Assets</span>
							<span class="font-mono">Rp 250,500,000</span>
						</div>
						
						<div class="flex justify-between mt-2">
							<span class="font-medium">Fixed Assets</span>
							<span></span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Property and Equipment</span>
							<span class="font-mono">Rp 500,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Accumulated Depreciation</span>
							<span class="font-mono">Rp (100,000,000)</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Total Fixed Assets</span>
							<span class="font-mono">Rp 400,000,000</span>
						</div>
						
						<div class="flex justify-between font-semibold mt-2 border-t pt-1">
							<span>Total Assets</span>
							<span class="font-mono">Rp 650,500,000</span>
						</div>
					</div>
				</div>
				
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Liabilities and Equity</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between">
							<span class="font-medium">Current Liabilities</span>
							<span></span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Accounts Payable</span>
							<span class="font-mono">Rp 45,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Accrued Expenses</span>
							<span class="font-mono">Rp 25,000,000</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Total Current Liabilities</span>
							<span class="font-mono">Rp 70,000,000</span>
						</div>
						
						<div class="flex justify-between mt-2">
							<span class="font-medium">Equity</span>
							<span></span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Common Stock</span>
							<span class="font-mono">Rp 450,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Retained Earnings</span>
							<span class="font-mono">Rp 130,500,000</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Total Equity</span>
							<span class="font-mono">Rp 580,500,000</span>
						</div>
						
						<div class="flex justify-between font-semibold mt-2 border-t pt-1">
							<span>Total Liabilities and Equity</span>
							<span class="font-mono">Rp 650,500,000</span>
						</div>
					</div>
				</div>
			</div>
		{:else if reportType === 'INCOME_STATEMENT'}
			<div class="space-y-4">
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Revenue</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between pl-4">
							<span>Sales Revenue</span>
							<span class="font-mono">Rp 850,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Service Revenue</span>
							<span class="font-mono">Rp 150,000,000</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Total Revenue</span>
							<span class="font-mono">Rp 1,000,000,000</span>
						</div>
					</div>
				</div>
				
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Expenses</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between pl-4">
							<span>Cost of Goods Sold</span>
							<span class="font-mono">Rp 500,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Salaries and Wages</span>
							<span class="font-mono">Rp 150,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Rent Expense</span>
							<span class="font-mono">Rp 60,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Utilities</span>
							<span class="font-mono">Rp 35,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Depreciation</span>
							<span class="font-mono">Rp 25,000,000</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Total Expenses</span>
							<span class="font-mono">Rp 770,000,000</span>
						</div>
					</div>
				</div>
				
				<div>
					<div class="flex justify-between font-semibold border-t pt-1">
						<span>Net Income</span>
						<span class="font-mono">Rp 230,000,000</span>
					</div>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Operating Activities</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between pl-4">
							<span>Net Income</span>
							<span class="font-mono">Rp 230,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Adjustments for Depreciation</span>
							<span class="font-mono">Rp 25,000,000</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Changes in Accounts Receivable</span>
							<span class="font-mono">Rp (15,000,000)</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Changes in Inventory</span>
							<span class="font-mono">Rp (10,000,000)</span>
						</div>
						<div class="flex justify-between pl-4">
							<span>Changes in Accounts Payable</span>
							<span class="font-mono">Rp 5,000,000</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Net Cash from Operating Activities</span>
							<span class="font-mono">Rp 235,000,000</span>
						</div>
					</div>
				</div>
				
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Investing Activities</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between pl-4">
							<span>Purchase of Equipment</span>
							<span class="font-mono">Rp (80,000,000)</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Net Cash Used in Investing Activities</span>
							<span class="font-mono">Rp (80,000,000)</span>
						</div>
					</div>
				</div>
				
				<div>
					<h4 class="text-lg font-semibold border-b pb-1">Financing Activities</h4>
					<div class="ml-4 mt-2 space-y-1">
						<div class="flex justify-between pl-4">
							<span>Dividends Paid</span>
							<span class="font-mono">Rp (50,000,000)</span>
						</div>
						<div class="flex justify-between font-medium">
							<span class="pl-4">Net Cash Used in Financing Activities</span>
							<span class="font-mono">Rp (50,000,000)</span>
						</div>
					</div>
				</div>
				
				<div>
					<div class="flex justify-between font-semibold border-t pt-1">
						<span>Net Increase in Cash</span>
						<span class="font-mono">Rp 105,000,000</span>
					</div>
					<div class="flex justify-between">
						<span>Cash at Beginning of Period</span>
						<span class="font-mono">Rp 20,000,000</span>
					</div>
					<div class="flex justify-between font-semibold">
						<span>Cash at End of Period</span>
						<span class="font-mono">Rp 125,000,000</span>
					</div>
				</div>
			</div>
		{/if}
		
		<!-- Report Footer -->
		<div class="mt-8 text-center">
			<p class="text-sm text-gray-500">This report is for demonstration purposes only.</p>
		</div>
	</div>
	
	<!-- Print footer -->
	<div class="hidden print:mt-8 print:block">
		<div class="text-sm">
			<p>Printed on: {new Date().toLocaleString('id-ID')}</p>
			<p>PT Lare Osing Ndo - Indonesia</p>
		</div>
	</div>
</div>