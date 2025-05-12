<script lang="ts">
	import { goto } from '$app/navigation';
	import { Calendar, BarChart, FileText, PieChart, ArrowRight } from '@lucide/svelte';

	const ledgerModules = [
		{
			name: 'Fiscal Periods',
			description: 'Manage and configure accounting periods',
			href: '/gl/ledger/periods',
			icon: Calendar,
			color: 'bg-blue-100 text-blue-700'
		},
		{
			name: 'Journals',
			description: 'Create and post accounting transactions',
			href: '/gl/ledger/journals',
			icon: FileText,
			color: 'bg-green-100 text-green-700'
		},
		{
			name: 'Analyzer',
			description: 'Analyze and investigate ledger data',
			href: '/gl/ledger/analyzer',
			icon: PieChart,
			color: 'bg-purple-100 text-purple-700'
		},
		{
			name: 'Reports',
			description: 'Generate and view financial reports',
			href: '/gl/ledger/reports',
			icon: BarChart,
			color: 'bg-orange-100 text-orange-700'
		}
	];

	// Sample ledger statistics
	const ledgerStats = [
		{ label: 'Open Journal Entries', value: '12' },
		{ label: 'Posted This Month', value: '45' },
		{ label: 'Current Period', value: 'May 2024' },
		{ label: 'Fiscal Year', value: '2024' }
	];
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Ledger Management</h1>
			<p class="text-sm text-gray-500">Manage financial transactions and reports</p>
		</div>
	</div>

	<!-- Ledger Modules Cards -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		{#each ledgerModules as module}
			<a
				href={module.href}
				class="card border bg-base-100 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
			>
				<div class="card-body">
					<div class="flex items-start justify-between">
						<div class="{module.color} flex h-12 w-12 items-center justify-center rounded-lg">
							<svelte:component this={module.icon} class="h-6 w-6" />
						</div>
						<ArrowRight class="h-5 w-5 text-gray-400" />
					</div>
					<h2 class="card-title mt-4">{module.name}</h2>
					<p class="text-gray-500">{module.description}</p>
				</div>
			</a>
		{/each}
	</div>

	<!-- Ledger Stats -->
	<div class="card bg-base-100 border">
		<div class="card-body">
			<h2 class="card-title">
				<FileText class="h-5 w-5 text-primary" />
				<span>Current Ledger Status</span>
			</h2>
			
			<div class="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each ledgerStats as stat}
					<div class="rounded-lg border bg-base-200 p-4">
						<div class="text-sm font-medium text-gray-500">{stat.label}</div>
						<div class="mt-1 text-lg font-bold">{stat.value}</div>
					</div>
				{/each}
			</div>
			
			<div class="mt-6 flex flex-wrap justify-center gap-4">
				<a href="/gl/ledger/journals" class="btn btn-outline btn-sm">Manage Journals</a>
				<a href="/gl/ledger/periods" class="btn btn-outline btn-sm">Configure Periods</a>
				<a href="/gl/ledger/reports" class="btn btn-outline btn-sm">View Reports</a>
			</div>
		</div>
	</div>
	
	<!-- Recent Activity -->
	<div class="card bg-base-100 border">
		<div class="card-body">
			<h2 class="card-title">
				<Calendar class="h-5 w-5 text-primary" />
				<span>Recent Activity</span>
			</h2>
			
			<div class="mt-4 space-y-4">
				<div class="rounded-lg border p-4">
					<div class="flex justify-between items-center">
						<div>
							<div class="font-medium">Period Closed</div>
							<div class="text-sm text-gray-500">April 2024 accounting period has been closed</div>
						</div>
						<div class="text-sm text-gray-500">Today, 10:30</div>
					</div>
				</div>
				
				<div class="rounded-lg border p-4">
					<div class="flex justify-between items-center">
						<div>
							<div class="font-medium">Journal Entry Posted</div>
							<div class="text-sm text-gray-500">JE-00045: Monthly Expense Allocation</div>
						</div>
						<div class="text-sm text-gray-500">Yesterday, 14:15</div>
					</div>
				</div>
				
				<div class="rounded-lg border p-4">
					<div class="flex justify-between items-center">
						<div>
							<div class="font-medium">Financial Report Generated</div>
							<div class="text-sm text-gray-500">Balance Sheet: April 2024</div>
						</div>
						<div class="text-sm text-gray-500">May 3, 2024</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>