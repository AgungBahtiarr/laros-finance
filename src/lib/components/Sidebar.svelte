<script lang="ts">
	import { page } from '$app/state';
	import {
		Home,
		FileText,
		Box,
		ChevronDown,
		Package,
		CreditCard,
		Landmark,
		Tag,
		Users,
		BarChart3,
		Calendar,
		BookOpen
	} from '@lucide/svelte';

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
					href: '/gl/accounts/types',
					icon: Tag
				},
				{
					name: 'Account Groups',
					href: '/gl/accounts/groups',
					icon: Users
				},
				{
					name: 'Account List',
					href: '/gl/accounts/list',
					icon: FileText
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
					href: '/gl/ledger/periods',
					icon: Calendar
				},
				{
					name: 'Journals',
					href: '/gl/ledger/journals',
					icon: BookOpen
				},
				{
					name: 'Report Analysis',
					href: '/gl/ledger/reports/profit-loss',
					icon: BarChart3
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

<div
	class="flex h-[100vh] flex-col border-r border-gray-200 bg-white dark:border-white dark:bg-black"
>
	<!-- Header dengan border dinamis -->
	<div
		class="flex h-14 items-center justify-center gap-2 border-b border-gray-200 px-6 dark:border-gray-800"
	>
		<img class="h-8" src="/images/laros-logo.png" alt="Laros" />
		<span class="text-primary text-lg font-bold">Laros Finance.</span>
	</div>
	<div class="flex-1 overflow-y-auto px-3 py-4">
		<nav class="space-y-1">
			{#each navigation as item}
				{#if item.submenu}
					<details class="collapse" open>
						<!-- Menu utama dengan submenu -->
						<summary
							class={`flex items-center justify-between rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${
								isActive(item)
									? 'bg-primary/10 text-primary font-medium'
									: 'hover:text-gray-900 dark:hover:text-white'
							}`}
						>
							<div class="flex w-full items-center justify-between">
								<div class="flex items-center gap-3">
									<svelte:component this={item.icon} class="h-5 w-5" />
									<span>{item.name}</span>
								</div>
								<ChevronDown class="h-4 w-4 transition-transform" />
							</div>
						</summary>
						{#each item.submenu as menu}
							{#if menu.subsubmenu}
								<details class="collapse pl-4" open>
									<!-- Submenu dengan subsubmenu -->
									<summary
										class={`flex items-center justify-between rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${
											page.url.pathname.startsWith(menu.href)
												? 'bg-primary/10 text-primary font-medium'
												: 'hover:text-gray-900 dark:hover:text-white'
										}`}
									>
										<div class="flex w-full items-center justify-between">
											<div class="flex items-center gap-3">
												<svelte:component this={menu.icon} class="h-5 w-5" />
												<span>{menu.name}</span>
											</div>
											<ChevronDown class="h-4 w-4 transition-transform" />
										</div>
									</summary>
									{#each menu.subsubmenu as submenu}
										<!-- Item menu level terdalam -->
										<a
											href={submenu.href}
											class={`flex items-center gap-3 rounded-lg py-2 pl-12 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${
												page.url.pathname === submenu.href
													? 'text-primary font-medium'
													: 'hover:text-gray-900 dark:hover:text-white'
											}`}
										>
											<span>{submenu.name}</span>
										</a>
									{/each}
								</details>
							{:else}
								<!-- Submenu tanpa nesting lebih lanjut -->
								<a
									href={menu.href}
									class={`flex items-center gap-3 rounded-lg py-2 pl-8 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${
										page.url.pathname === menu.href
											? 'text-primary font-medium'
											: 'hover:text-gray-900 dark:hover:text-white'
									}`}
								>
									<svelte:component this={menu.icon} class="h-5 w-5" />
									{menu.name}
								</a>
							{/if}
						{/each}
					</details>
				{:else}
					<!-- Menu utama tanpa submenu -->
					<a
						href={item.href}
						class={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${
							isActive(item)
								? 'bg-primary/10 text-primary font-medium'
								: 'hover:text-gray-900 dark:hover:text-white'
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
