<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		Search,
		Filter,
		ChevronDown,
		ChevronUp,
		BarChart2,
		PieChart,
		DollarSign,
		ArrowUpRight,
		ArrowDownRight,
		Database,
		Calendar
	} from '@lucide/svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let showFilters = $state(true);
	let chartType = $state('pie'); // 'pie' or 'bar'

	// Filter state
	let accountId = $state(data.filters.accountId);
	let accountTypeId = $state(data.filters.accountTypeId);
	let startDate = $state(data.filters.startDate);
	let endDate = $state(data.filters.endDate);
	let fiscalPeriodId = $state(data.filters.fiscalPeriodId);

	// Format amount as currency
	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(parseFloat(amount) || 0);
	}

	// Format date for display
	function formatDate(dateString) {
		const date = new Date(dateString);
		return date.toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Apply filters
	function applyFilters() {
		const searchParams = new URLSearchParams();

		if (accountId) searchParams.set('accountId', accountId);
		if (accountTypeId) searchParams.set('accountTypeId', accountTypeId);
		if (startDate) searchParams.set('startDate', startDate);
		if (endDate) searchParams.set('endDate', endDate);
		if (fiscalPeriodId) searchParams.set('fiscalPeriodId', fiscalPeriodId);

		goto(`?${searchParams.toString()}`);
	}

	// Reset filters
	function resetFilters() {
		accountId = '';
		accountTypeId = '';
		startDate = '';
		endDate = '';
		fiscalPeriodId = '';

		goto('/gl/ledger/analyzer');
	}

	// Get color for account type
	function getAccountTypeColor(code) {
		const colors = {
			ASSET: 'bg-blue-100 text-blue-800',
			LIABILITY: 'bg-red-100 text-red-800',
			EQUITY: 'bg-purple-100 text-purple-800',
			REVENUE: 'bg-green-100 text-green-800',
			EXPENSE: 'bg-orange-100 text-orange-800'
		};
		return colors[code] || 'bg-gray-100 text-gray-800';
	}

	// Get chart color by index
	function getChartColor(index, alpha = 0.8) {
		const colors = [
			`rgba(244, 127, 32, ${alpha})`, // Primary
			`rgba(73, 138, 201, ${alpha})`, // Secondary
			`rgba(92, 184, 92, ${alpha})`,
			`rgba(240, 173, 78, ${alpha})`,
			`rgba(91, 192, 222, ${alpha})`,
			`rgba(217, 83, 79, ${alpha})`,
			`rgba(150, 117, 206, ${alpha})`
		];
		return colors[index % colors.length];
	}

	// Initialize charts when data is available
	onMount(() => {
		if (typeof window !== 'undefined' && window.Chart) {
			renderAccountTypeBalanceChart();
		}
	});

	// Render account type balance chart
	function renderAccountTypeBalanceChart() {
		// Only render if we have data
		if (!data.balancesByType || data.balancesByType.length === 0) return;

		const ctx = document.getElementById('accountTypeBalanceChart');
		if (!ctx) return;

		// Filter out account types with zero balance
		const chartData = data.balancesByType
			.filter((item) => Math.abs(item.totalBalance) > 0)
			.map((item, index) => ({
				label: item.accountType.name,
				value: Math.abs(item.totalBalance),
				color: getChartColor(index)
			}));

		if (chartData.length === 0) return;

		// Create chart based on selected type
		const chart = new Chart(ctx, {
			type: chartType === 'pie' ? 'doughnut' : 'bar',
			data: {
				labels: chartData.map((item) => item.label),
				datasets: [
					{
						data: chartData.map((item) => item.value),
						backgroundColor: chartData.map((item) => item.color),
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: chartType === 'pie',
						position: 'bottom'
					},
					title: {
						display: true,
						text: 'Account Balances by Type'
					}
				},
				...(chartType === 'bar'
					? {
							scales: {
								y: {
									beginAtZero: true,
									ticks: {
										callback: function (value) {
											return formatCurrency(value);
										}
									}
								}
							}
						}
					: {})
			}
		});

		return () => chart.destroy();
	}

	// Toggle chart type and redraw
	function toggleChartType() {
		chartType = chartType === 'pie' ? 'bar' : 'pie';
		setTimeout(() => {
			const oldChart = Chart.getChart('accountTypeBalanceChart');
			if (oldChart) {
				oldChart.destroy();
			}
			renderAccountTypeBalanceChart();
		}, 0);
	}

	// Effect to redraw charts when data changes
	$effect(() => {
		if (data.balancesByType) {
			setTimeout(() => {
				const oldChart = Chart.getChart('accountTypeBalanceChart');
				if (oldChart) {
					oldChart.destroy();
				}
				renderAccountTypeBalanceChart();
			}, 0);
		}
	});
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<div class="flex items-center gap-2">
				<a href="/gl/ledger" class="btn btn-ghost btn-sm px-2">
					<ArrowLeft class="h-4 w-4" />
				</a>
				<h1 class="text-2xl font-bold text-gray-900">General Ledger Analyzer</h1>
			</div>
			<p class="text-sm text-gray-500">Analyze account balances and transaction history</p>
		</div>
		<div class="flex gap-2">
			<button class="btn btn-outline btn-sm gap-1" onclick={() => (showFilters = !showFilters)}>
				<Filter class="h-4 w-4" />
				{showFilters ? 'Hide Filters' : 'Show Filters'}
			</button>
		</div>
	</div>

	<!-- Filters -->
	{#if showFilters}
		<div class="card bg-base-100 border">
			<div class="card-body p-4">
				<h3 class="card-title text-lg">Analysis Filters</h3>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<div class="form-control w-full">
						<label class="label" for="accountTypeId">
							<span class="label-text">Account Type</span>
						</label>
						<select id="accountTypeId" class="select select-bordered w-full" bind:value={accountTypeId}>
							<option value="">All Account Types</option>
							{#each data.accountTypes as type}
								<option value={type.id}>{type.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="accountId">
							<span class="label-text">Account</span>
						</label>
						<select id="accountId" class="select select-bordered w-full" bind:value={accountId}>
							<option value="">All Accounts</option>
							{#each data.accounts.filter(a => !accountTypeId || a.accountTypeId.toString() === accountTypeId) as account}
								<option value={account.id}>
									{account.code} - {account.name}
								</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="fiscalPeriodId">
							<span class="label-text">Fiscal Period</span>
						</label>
						<select id="fiscalPeriodId" class="select select-bordered w-full" bind:value={fiscalPeriodId}>
							<option value="">All Periods</option>
							{#each data.fiscalPeriods as period}
								<option value={period.id}>{period.name}</option>
							{/each}
						</select>
					</div>

					<div class="form-control w-full">
						<label class="label" for="startDate">
							<span class="label-text">Start Date</span>
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
						</label>
						<input type="date" id="endDate" class="input input-bordered w-full" bind:value={endDate} />
					</div>
				</div>

				<div class="mt-4 flex justify-end gap-2">
					<button class="btn btn-outline btn-sm" onclick={resetFilters}>Reset</button>
					<button class="btn btn-primary btn-sm" onclick={applyFilters}>Apply Filters</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Dashboard -->
	{#if !data.accountDetails && !data.accountTypeSummary}
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each data.balancesByType.filter(item => item.totalBalance !== 0) as typeBalance}
				<div class="card bg-base-100 border">
					<div class="card-body p-4">
						<div class="flex items-center gap-3">
							<div class={`rounded-full p-3 ${getAccountTypeColor(typeBalance.accountType.code)}`}>
								<DollarSign class="h-5 w-5" />
							</div>
							<div>
								<div class="text-sm font-medium text-gray-500">{typeBalance.accountType.name}</div>
								<div class="text-lg font-bold">
									{formatCurrency(typeBalance.totalBalance)}
								</div>
							</div>
						</div>
						<div class="mt-2 text-xs text-gray-500">
							{typeBalance.accountCount} {typeBalance.accountCount === 1 ? 'account' : 'accounts'}
						</div>
						<a
							href={`?accountTypeId=${typeBalance.accountType.id}`}
							class="mt-4 text-sm text-primary hover:underline"
						>
							View details
						</a>
					</div>
				</div>
			{/each}
		</div>

		<!-- Chart -->
		<div class="card bg-base-100 border">
			<div class="card-body">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="card-title">Account Balance Distribution</h3>
					<div class="flex gap-2">
						<button class="btn btn-ghost btn-sm" onclick={toggleChartType}>
							{#if chartType === 'pie'}
								<BarChart2 class="h-4 w-4" />
								<span class="ml-1">Bar Chart</span>
							{:else}
								<PieChart class="h-4 w-4" />
								<span class="ml-1">Pie Chart</span>
							{/if}
						</button>
					</div>
				</div>

				<div class="h-64">
					<canvas id="accountTypeBalanceChart"></canvas>
				</div>

				<div class="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
					{#each data.balancesByType.filter(item => Math.abs(item.totalBalance) > 0) as item, i}
						<div class="flex items-center gap-2">
							<div class="h-3 w-3" style="background-color: {getChartColor(i)}"></div>
							<span class="text-sm truncate">
								{item.accountType.name} ({formatCurrency(item.totalBalance)})
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Account Type Summary -->
	{#if data.accountTypeSummary}
		<div class="card bg-base-100 border">
			<div class="card-body">
				<div class="flex items-center gap-3">
					<div class={`rounded-full p-3 ${getAccountTypeColor(data.accountTypeSummary.accountType.code)}`}>
						<Database class="h-5 w-5" />
					</div>
					<div>
						<h3 class="text-xl font-bold">{data.accountTypeSummary.accountType.name} Accounts</h3>
						<p class="text-sm text-gray-500">
							Normal Balance: {data.accountTypeSummary.accountType.normalBalance}
						</p>
					</div>
				</div>

				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">Total Balance</div>
						<div class="mt-1 text-xl font-bold">
							{formatCurrency(data.accountTypeSummary.totalBalance)}
						</div>
					</div>
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">Total Debits</div>
						<div class="mt-1 text-xl font-bold">
							{formatCurrency(data.accountTypeSummary.totalDebit)}
						</div>
					</div>
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">Total Credits</div>
						<div class="mt-1 text-xl font-bold">
							{formatCurrency(data.accountTypeSummary.totalCredit)}
						</div>
					</div>
				</div>

				<div class="mt-6 overflow-x-auto">
					<table class="table">
						<thead class="bg-base-200">
							<tr>
								<th>Account</th>
								<th class="text-right">Debits</th>
								<th class="text-right">Credits</th>
								<th class="text-right">Balance</th>
								<th class="w-24"></th>
							</tr>
						</thead>
						<tbody>
							{#each data.accountTypeSummary.accounts.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)) as item}
								<tr class="hover">
									<td>
										<div class="font-medium">{item.account.code} - {item.account.name}</div>
									</td>
									<td class="text-right tabular-nums">{formatCurrency(item.debitSum)}</td>
									<td class="text-right tabular-nums">{formatCurrency(item.creditSum)}</td>
									<td class="text-right tabular-nums font-medium">
										{formatCurrency(item.balance)}
									</td>
									<td>
										<a
											href={`?accountId=${item.account.id}`}
											class="btn btn-ghost btn-xs text-primary"
										>
											Details
										</a>
									</td>
								</tr>
							{/each}

							{#if data.accountTypeSummary.accounts.length === 0}
								<tr>
									<td colspan="5" class="py-4 text-center text-gray-500">
										No accounts found for this account type
									</td>
								</tr>
							{/if}
						</tbody>
						{#if data.accountTypeSummary.accounts.length > 0}
							<tfoot class="bg-base-200 font-semibold">
								<tr>
									<td>Total</td>
									<td class="text-right tabular-nums">
										{formatCurrency(data.accountTypeSummary.totalDebit)}
									</td>
									<td class="text-right tabular-nums">
										{formatCurrency(data.accountTypeSummary.totalCredit)}
									</td>
									<td class="text-right tabular-nums">
										{formatCurrency(data.accountTypeSummary.totalBalance)}
									</td>
									<td></td>
								</tr>
							</tfoot>
						{/if}
					</table>
				</div>
			</div>
		</div>
	{/if}

	<!-- Account Details -->
	{#if data.accountDetails}
		<div class="card bg-base-100 border">
			<div class="card-body">
				<div class="flex items-center gap-3">
					<div class={`rounded-full p-3 ${getAccountTypeColor(data.accountDetails.accountType.code)}`}>
						<DollarSign class="h-5 w-5" />
					</div>
					<div>
						<h3 class="text-xl font-bold">
							{data.accountDetails.code} - {data.accountDetails.name}
						</h3>
						<p class="text-sm text-gray-500">
							{data.accountDetails.accountType.name} Account (Normal Balance:
							{data.accountDetails.accountType.normalBalance})
						</p>
					</div>
				</div>

				<!-- Account Summary -->
				<div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">Current Balance</div>
						<div class="mt-1 flex items-center">
							<span class="text-xl font-bold">{formatCurrency(data.accountDetails.netBalance)}</span>
							{#if data.accountDetails.netBalance > 0}
								<ArrowUpRight class="ml-2 h-4 w-4 text-success" />
							{:else if data.accountDetails.netBalance < 0}
								<ArrowDownRight class="ml-2 h-4 w-4 text-error" />
							{/if}
						</div>
					</div>
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">Total Debits</div>
						<div class="mt-1 text-xl font-bold">
							{formatCurrency(data.accountDetails.totalDebit)}
						</div>
					</div>
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">Total Credits</div>
						<div class="mt-1 text-xl font-bold">
							{formatCurrency(data.accountDetails.totalCredit)}
						</div>
					</div>
				</div>

				<!-- Period Balances -->
				{#if data.accountDetails.balancesByPeriod && data.accountDetails.balancesByPeriod.length > 0}
					<div class="mt-6">
						<h4 class="font-medium">Balance by Period</h4>
						<div class="mt-2 overflow-x-auto">
							<table class="table table-sm">
								<thead>
									<tr>
										<th>Period</th>
										<th class="text-right">Debits</th>
										<th class="text-right">Credits</th>
										<th class="text-right">Net</th>
									</tr>
								</thead>
								<tbody>
									{#each data.accountDetails.balancesByPeriod.sort((a, b) => new Date(b.period.endDate).getTime() - new Date(a.period.endDate).getTime()) as balance}
										<tr>
											<td>{balance.period.name}</td>
											<td class="text-right tabular-nums">
												{formatCurrency(balance.debitSum)}
											</td>
											<td class="text-right tabular-nums">
												{formatCurrency(balance.creditSum)}
											</td>
											<td class="text-right tabular-nums">
												{#if data.accountDetails.accountType.normalBalance === 'DEBIT'}
													{formatCurrency(balance.debitSum - balance.creditSum)}
												{:else}
													{formatCurrency(balance.creditSum - balance.debitSum)}
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Transactions -->
				<div class="mt-6">
					<h4 class="font-medium">Transaction History</h4>
					{#if data.accountTransactions.length > 0}
						<div class="mt-2 overflow-x-auto">
							<table class="table table-sm">
								<thead>
									<tr>
										<th>Date</th>
										<th>Entry</th>
										<th>Description</th>
										<th class="text-right">Debit</th>
										<th class="text-right">Credit</th>
										<th class="text-right">Running Balance</th>
									</tr>
								</thead>
								<tbody>
									{#each data.accountTransactions as transaction}
										{#each transaction.lines as line}
											<tr>
												<td>{formatDate(transaction.date)}</td>
												<td class="font-mono text-xs">{transaction.number}</td>
												<td>
													<div>{transaction.description}</div>
													{#if line.description}
														<div class="text-xs text-gray-500">{line.description}</div>
													{/if}
												</td>
												<td class="text-right tabular-nums">
													{line.debitAmount > 0 ? formatCurrency(line.debitAmount) : ''}
												</td>
												<td class="text-right tabular-nums">
													{line.creditAmount > 0 ? formatCurrency(line.creditAmount) : ''}
												</td>
												<td class="text-right tabular-nums">
													<!-- Note: Would need to calculate running balance -->
												</td>
											</tr>
										{/each}
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="mt-4 rounded-lg border bg-base-200 p-6 text-center text-gray-500">
							No transactions found for this account with the current filters
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>