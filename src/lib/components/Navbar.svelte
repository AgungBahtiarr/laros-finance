<script lang="ts">
	import { page } from '$app/state';
	let { user, children } = $props();
</script>

<header class="flex h-14 items-center gap-4 border-b px-6">
	<div class="lg:hidden">
		<label for="sidebar-mobile-nav" class="btn btn-ghost btn-square drawer-button">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 text-gray-600"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</label>
	</div>

	<div class="flex flex-1 items-center gap-4">
		<h1 class="text-primary text-lg font-semibold">
			{page.url.pathname.split('/')[1].charAt(0).toUpperCase() +
				page.url.pathname.split('/')[1].slice(1) ==
			'Gl'
				? 'General Ledger'
				: page.url.pathname.split('/')[1].charAt(0).toUpperCase() +
					page.url.pathname.split('/')[1].slice(1)}
		</h1>
	</div>

	<div class="flex items-center gap-4">
		<div class="dropdown dropdown-end">
			<label for="user-menu" tabindex="-1" class="btn btn-ghost btn-circle avatar">
				<div class="w-10 rounded-full ring-1 ring-gray-200">
					<img
						src={user?.image ||
							'https://ui-avatars.com/api/?background=random&color=random&name=' + user?.name}
						alt={user?.name}
					/>
				</div>
			</label>
			<ul
				id="user-menu"
				tabindex="-1"
				class="menu dropdown-content bg-base-100 mt-3 w-52 rounded-lg border p-2 shadow-lg"
			>
				<li class="text-gray-700">{@render children()}</li>
			</ul>
		</div>
	</div>
</header>
