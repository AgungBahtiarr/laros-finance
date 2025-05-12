<script lang="ts">
	import { goto } from '$app/navigation';
	import { Landmark, List, Grid3X3, FileText, ArrowRight } from '@lucide/svelte';

	const accountModules = [
		{
			name: 'Account Types',
			description: 'Manage different types of accounts',
			href: '/gl/accounts/types',
			icon: Grid3X3,
			color: 'bg-blue-100 text-blue-700'
		},
		{
			name: 'Account Groups',
			description: 'Manage top-level account categories',
			href: '/gl/accounts/groups',
			icon: List,
			color: 'bg-green-100 text-green-700'
		},
		{
			name: 'Account List',
			description: 'View and manage all accounts',
			href: '/gl/accounts/list',
			icon: FileText,
			color: 'bg-purple-100 text-purple-700'
		}
	];

	// Total accounts stats
	const accountStats = [
		{ label: 'Total Accounts', value: '85' },
		{ label: 'Asset Accounts', value: '24' },
		{ label: 'Liability Accounts', value: '18' },
		{ label: 'Equity Accounts', value: '8' },
		{ label: 'Revenue Accounts', value: '15' },
		{ label: 'Expense Accounts', value: '20' }
	];
</script>

<div class="space-y-6">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
			<p class="text-sm text-gray-500">Manage your account structure</p>
		</div>
	</div>

	<!-- COA Modules Cards -->
	<div class="grid gap-6 md:grid-cols-3">
		{#each accountModules as module}
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

	<!-- Account Structure -->
	<div class="card bg-base-100 border">
		<div class="card-body">
			<h2 class="card-title">
				<Landmark class="h-5 w-5 text-primary" />
				<span>Account Structure</span>
			</h2>
			
			<div class="mt-4 overflow-x-auto">
				<table class="table table-sm">
					<thead class="bg-base-200 text-sm">
						<tr>
							<th>Account Type</th>
							<th>Normal Balance</th>
							<th>Count</th>
							<th>Description</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td class="font-medium">Assets</td>
							<td><div class="badge badge-sm bg-blue-100 text-blue-800">DEBIT</div></td>
							<td>24</td>
							<td>Resources owned by the business</td>
						</tr>
						<tr>
							<td class="font-medium">Liabilities</td>
							<td><div class="badge badge-sm bg-red-100 text-red-800">CREDIT</div></td>
							<td>18</td>
							<td>Obligations owed to others</td>
						</tr>
						<tr>
							<td class="font-medium">Equity</td>
							<td><div class="badge badge-sm bg-purple-100 text-purple-800">CREDIT</div></td>
							<td>8</td>
							<td>Owner's interest in the business</td>
						</tr>
						<tr>
							<td class="font-medium">Revenue</td>
							<td><div class="badge badge-sm bg-green-100 text-green-800">CREDIT</div></td>
							<td>15</td>
							<td>Income earned from business activities</td>
						</tr>
						<tr>
							<td class="font-medium">Expenses</td>
							<td><div class="badge badge-sm bg-orange-100 text-orange-800">DEBIT</div></td>
							<td>20</td>
							<td>Costs incurred in business operations</td>
						</tr>
					</tbody>
				</table>
			</div>
			
			<div class="mt-6 text-center">
				<a href="/gl/accounts/list" class="btn btn-outline btn-sm">View All Accounts</a>
			</div>
		</div>
	</div>
	
	<!-- Quick Tips -->
	<div class="card bg-base-100 border">
		<div class="card-body">
			<h2 class="card-title text-lg">Tips for Managing Your Chart of Accounts</h2>
			
			<div class="mt-4 space-y-4">
				<div class="rounded-lg border p-4">
					<div class="font-medium">Consistent Numbering System</div>
					<p class="text-sm text-gray-600">
						Use a consistent numbering system for your accounts (e.g., 1000-1999 for assets, 2000-2999 for liabilities).
					</p>
				</div>
				
				<div class="rounded-lg border p-4">
					<div class="font-medium">Hierarchical Structure</div>
					<p class="text-sm text-gray-600">
						Organize accounts in a hierarchical structure with parent accounts and sub-accounts.
					</p>
				</div>
				
				<div class="rounded-lg border p-4">
					<div class="font-medium">Regular Review</div>
					<p class="text-sm text-gray-600">
						Periodically review your chart of accounts to ensure it still meets your business needs.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
