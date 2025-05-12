<script lang="ts">
	import { goto } from '$app/navigation';
	import { BookOpen, ChevronRight, CreditCard, Landmark, BarChart2, Calendar } from '@lucide/svelte';

	const glModules = [
		{
			name: 'Chart of Accounts',
			description: 'View and manage your account structure',
			icon: Landmark,
			href: '/gl/accounts',
			color: 'bg-blue-100 text-blue-700'
		},
		{
			name: 'Journal Entries',
			description: 'Create and post accounting transactions',
			icon: CreditCard,
			href: '/gl/journal',
			color: 'bg-green-100 text-green-700'
		},
		{
			name: 'Financial Reports',
			description: 'Generate and analyze financial statements',
			icon: BarChart2,
			href: '/gl/reports',
			color: 'bg-purple-100 text-purple-700'
		}
	];
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">General Ledger</h1>
		<p class="text-gray-500">Manage your accounting system</p>
	</div>

	<!-- GL Modules Cards -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each glModules as module}
			<a
				href={module.href}
				class="card border bg-base-100 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
			>
				<div class="card-body">
					<div class="flex items-start justify-between">
						<div class="{module.color} flex h-12 w-12 items-center justify-center rounded-lg">
							<svelte:component this={module.icon} class="h-6 w-6" />
						</div>
						<ChevronRight class="h-5 w-5 text-gray-400" />
					</div>
					<h2 class="card-title mt-4">{module.name}</h2>
					<p class="text-gray-500">{module.description}</p>
				</div>
			</a>
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
			
			<div class="mt-4 text-center">
				<button class="btn btn-outline btn-sm">Close Current Period</button>
			</div>
		</div>
	</div>
</div>