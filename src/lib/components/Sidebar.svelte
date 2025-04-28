<script lang="ts">
	import { page } from '$app/state';
	import { Home, FileText, Box, ChevronDown, Package } from '@lucide/svelte';

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
		}
	];

	function isActive(item: { href: string; submenu?: { href: string }[] }) {
		if (item.submenu) {
			return (
				page.url.pathname === item.href ||
				item.submenu.some((sub) => page.url.pathname.startsWith(sub.href))
			);
		}
		return page.url.pathname === item.href;
	}
</script>

<div class="flex h-[100vh] flex-col border-r">
	<div class="flex h-14 justify-center items-center border-b px-6 gap-2">
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
