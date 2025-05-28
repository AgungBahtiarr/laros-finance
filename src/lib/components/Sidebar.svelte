<script lang="ts">
	import { page } from '$app/state';
	import { Home, FileText, Box, ChevronDown, Package, CreditCard, Landmark } from '@lucide/svelte';

	const navigation = [
		{
			name: 'Dashboard',
			href: '/dashboard',
			icon: Home
		},
		{
			name: 'Aset',
			href: '/assets',
			icon: Box,
			submenu: [
				{
					name: 'Assets',
					href: '/assets',
					icon: Package
				},
				{
					name: 'Laporan Aset',
					href: '/assets/report',
					icon: FileText
				}
			]
		},
		{
			name: 'Chart of Accounts',
			href: '/gl/accounts',
			icon: Landmark,
			submenu: [
				{
					name: 'Account Types',
					href: '/gl/accounts/types'
				},
				{
					name: 'Account Groups',
					href: '/gl/accounts/groups'
				},
				{
					name: 'Account List',
					href: '/gl/accounts/list'
				}
			]
		},
		{
			name: 'Ledger',
			href: '/gl/ledger',
			icon: CreditCard,
			submenu: [
				{
					name: 'Periods',
					href: '/gl/ledger/periods'
				},
				{
					name: 'Journals',
					href: '/gl/ledger/journals'
				},
				{
					name: 'Report Analysis',
					href: '/gl/ledger/reports/profit-loss'
				}
			]
		}
	];

	function isActive(item: {
		href: string;
		submenu?: { href: string; subsubmenu?: { href: string }[] }[];
	}) {
		if (item.submenu) {
			return (
				page.url.pathname === item.href ||
				item.submenu.some(
					(sub) =>
						page.url.pathname.startsWith(sub.href) ||
						(sub.subsubmenu &&
							sub.subsubmenu.some((subsub) => page.url.pathname.startsWith(subsub.href)))
				)
			);
		}
		return page.url.pathname === item.href;
	}
</script>

<div class="flex h-[100vh] flex-col border-r">
	<div class="flex h-14 items-center justify-center gap-2 border-b px-6">
		<img class="h-8" src="/images/laros-logo.png" alt="Laros" />
		<span class="text-primary text-lg font-bold">Laros Finance.</span>
	</div>
	<div class="flex-1 px-3 py-4">
		<nav class="space-y-1">
			{#each navigation as item}
				{#if item.submenu}
					<details class="collapse">
						<summary
							class={`flex items-center justify-between rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-50 ${
								isActive(item) ? 'bg-primary/10 text-primary font-medium' : 'hover:text-gray-900'
							}`}
						>
							<div class="flex justify-between">
								<div class="flex items-center gap-3">
									<svelte:component this={item.icon} class="h-5 w-5" />
									<span>{item.name}</span>
								</div>

								<ChevronDown class="h-4 w-4" />
							</div>
						</summary>
						{#each item.submenu as menu}
							{#if menu.subsubmenu}
								<details class="collapse pl-4">
									<summary
										class={`flex items-center justify-between rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-50 ${
											page.url.pathname.startsWith(menu.href)
												? 'text-primary font-medium'
												: 'hover:text-gray-900'
										}`}
									>
										<div class="flex justify-between">
											<div class="flex items-center gap-3">
												<svelte:component this={menu.icon} class="h-5 w-5" />
												<span>{menu.name}</span>
											</div>
											<ChevronDown class="h-4 w-4" />
										</div>
									</summary>
									{#each menu.subsubmenu as submenu}
										<a
											href={submenu.href}
											class={`flex items-center gap-3 rounded-lg py-2 pl-8 text-gray-600 transition-all hover:bg-gray-50 ${
												page.url.pathname === submenu.href
													? 'text-primary font-medium'
													: 'hover:text-gray-900'
											}`}
										>
											<span>{submenu.name}</span>
										</a>
									{/each}
								</details>
							{:else}
								<a
									href={menu.href}
									class={`flex items-center gap-3 rounded-lg py-2 pl-8 text-gray-600 transition-all hover:bg-gray-50 ${
										page.url.pathname === menu.href
											? 'text-primary font-medium'
											: 'hover:text-gray-900'
									}`}
								>
									<svelte:component this={menu.icon} class="h-5 w-5" />
									{menu.name}
								</a>
							{/if}
						{/each}
					</details>
				{:else}
					<a
						href={item.href}
						class={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-50 ${
							isActive(item) ? 'bg-primary/10 text-primary font-medium' : 'hover:text-gray-900'
						}`}
					>
						<svelte:component this={item.icon} class="h-5 w-5" />
						{item.name}
					</a>
				{/if}
			{/each}
		</nav>
	</div>
</div>
