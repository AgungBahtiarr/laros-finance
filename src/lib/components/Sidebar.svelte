<script lang="ts">
	import { page } from '$app/state';

	const navigation = [
		{
			name: 'Dashboard',
			href: '/dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
		},
		{
			name: 'Aset',
			href: '/assets',
			icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
			submenu: [
				{
					name: 'Assets',
					href: '/assets',
					icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
				},
				{
					name: 'Laporan',
					href: '/assets/report',
					icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
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
	<div class="flex h-14 items-center border-b px-6">
		<span class="text-primary text-lg font-bold">Laros Finance</span>
	</div>
	<div class="flex-1 px-3 py-4">
		<nav class="space-y-1">
			{#each navigation as item}
				{#if item.submenu}
					<details class="collapse">
						<summary
							class={`flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:bg-gray-50 ${
								isActive(item) ? 'bg-primary/10 text-primary font-medium' : 'hover:text-gray-900'
							}`}
						>
							<div class="flex items-center gap-3 rounded-lg">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={item.icon}
									/>
								</svg>
								<span>{item.name}</span>
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
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d={menu.icon}
									/>
								</svg>
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
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
						</svg>
						{item.name}
					</a>
				{/if}
			{/each}
		</nav>
	</div>
</div>
