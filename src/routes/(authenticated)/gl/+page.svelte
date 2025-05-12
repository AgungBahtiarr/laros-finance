<script lang="ts">
	import { goto } from '$app/navigation';
	import { BookOpen, ChevronRight, CreditCard, Landmark, BarChart2, Calendar, FileText, Database, PieChart, BarChart } from '@lucide/svelte';

	const glModules = [
		{
			name: 'Chart of Accounts',
			description: 'Manage account structure and classifications',
			icon: Landmark,
			href: '/gl/accounts',
			color: 'bg-blue-100 text-blue-700',
			submenu: [
				{
					name: 'Account Types',
					description: 'Manage account classifications',
					href: '/gl/accounts/types'
				},
				{
					name: 'Account Groups',
					description: 'Organize accounts into groups',
					href: '/gl/accounts/groups'
				},
				{
					name: 'Account List',
					description: 'View and edit all accounts',
					href: '/gl/accounts/list'
				}
			]
		},
		{
			name: 'Ledger',
			description: 'Manage financial transactions and reports',
			icon: Database,
			href: '/gl/ledger',
			color: 'bg-green-100 text-green-700',
			submenu: [
				{
					name: 'Periods',
					description: 'Manage fiscal periods',
					href: '/gl/ledger/periods',
					icon: Calendar
				},
				{
					name: 'Analyzer',
					description: 'Analyze financial data',
					href: '/gl/ledger/analyzer',
					icon: PieChart
				},
				{
					name: 'Journals',
					description: 'Create and post journal entries',
					href: '/gl/ledger/journals',
					icon: FileText
				},
				{
					name: 'Report Analysis',
					description: 'Generate financial reports',
					href: '/gl/ledger/reports',
					icon: BarChart
				}
			]
		}
	];
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">General Ledger</h1>
		<p class="text-gray-500">Manage your accounting system</p>
	</div>

	<!-- GL Modules Cards -->
	<div class="grid gap-6 md:grid-cols-2">
		{#each glModules as module}
			<div class="card border bg-base-100 shadow-sm">
				<div class="card-body">
					<div class="flex items-start justify-between">
						<div class="{module.color} flex h-12 w-12 items-center justify-center rounded-lg">
							<svelte:component this={module.icon} class="h-6 w-6" />
						</div>
					</div>
					<h2 class="card-title mt-4">{module.name}</h2>
					<p class="text-gray-500">{module.description}</p>
					
					<div class="grid gap-2 mt-4">
						{#if module.submenu}
							{#each module.submenu as submenu}
								<a 
									href={submenu.href}
									class="flex items-center justify-between rounded-md border p-3 hover:bg-base-200 transition-colors"
								>
									<div class="flex items-center gap-2">
										{#if submenu.icon}
											<svelte:component this={submenu.icon} class="h-4 w-4 text-gray-500" />
										{/if}
										<span>{submenu.name}</span>
									</div>
									<ChevronRight class="h-4 w-4 text-gray-400" />
								</a>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Quick Stats Section -->
	<div class="card border bg-base-100">
		<div class="card-body">
			<h2 class="card-title">
				<Calendar class="h-5 w-5 text-primary" />
				<span>Active Fiscal Period</span>
			</h2>
			
			<div class="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-lg border bg-base-200 p-4">
					<div class="text-sm font-medium text-gray-500">Current Period</div>
					<div class="mt-1 text-lg font-bold">May 2024</div>
				</div>
				
				<div class="rounded-lg border bg-base-200 p-4">
					<div class="text-sm font-medium text-gray-500">Open Entries</div>
					<div class="mt-1 text-lg font-bold">3</div>
				</div>
				
				<div class="rounded-lg border bg-base-200 p-4">
					<div class="text-sm font-medium text-gray-500">Last Closed</div>
					<div class="mt-1 text-lg font-bold">April 2024</div>
				</div>
				
				<div class="rounded-lg border bg-base-200 p-4">
					<div class="text-sm font-medium text-gray-500">Fiscal Year</div>
					<div class="mt-1 text-lg font-bold">2024</div>
				</div>
			</div>
			
			<div class="mt-4 flex justify-center gap-4">
				<a href="/gl/ledger/periods" class="btn btn-outline btn-sm">Manage Periods</a>
				<button class="btn btn-outline btn-sm">Close Current Period</button>
			</div>
		</div>
	</div>
	
	<!-- Recent Activity -->
	<div class="card border bg-base-100">
		<div class="card-body">
			<h2 class="card-title">
				<FileText class="h-5 w-5 text-primary" />
				<span>Recent Activity</span>
			</h2>
			
			<div class="mt-4 space-y-4">
				<div class="rounded-lg border p-4">
					<div class="flex justify-between items-center">
						<div>
							<div class="font-medium">Journal Entry Created</div>
							<div class="text-sm text-gray-500">JE-00024: Monthly Expense Allocation</div>
						</div>
						<div class="text-sm text-gray-500">Today, 14:32</div>
					</div>
				</div>
				
				<div class="rounded-lg border p-4">
					<div class="flex justify-between items-center">
						<div>
							<div class="font-medium">Journal Entry Posted</div>
							<div class="text-sm text-gray-500">JE-00023: Revenue Recognition</div>
						</div>
						<div class="text-sm text-gray-500">Yesterday, 10:15</div>
					</div>
				</div>
				
				<div class="rounded-lg border p-4">
					<div class="flex justify-between items-center">
						<div>
							<div class="font-medium">Account Added</div>
							<div class="text-sm text-gray-500">1205 - Software Licenses</div>
						</div>
						<div class="text-sm text-gray-500">May 15, 2024</div>
					</div>
				</div>
			</div>
			
			<div class="mt-4 text-center">
				<a href="/gl/ledger/journals" class="btn btn-outline btn-sm">View All Journal Entries</a>
			</div>
		</div>
	</div>
</div>