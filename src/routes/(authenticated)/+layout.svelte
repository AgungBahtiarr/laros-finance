<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/utils/auth-client';
	import Navbar from '$lib/components/Navbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SignOut from '$lib/components/SignOut.svelte';
	import { onMount } from 'svelte';

	const { children } = $props();
	let currentUser = $state(null);

	onMount(async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			goto('/auth/login');
		} else {
			currentUser = session.data.user;
		}
	});
</script>

<div class="drawer lg:drawer-open">
	<input id="sidebar-mobile-nav" type="checkbox" class="drawer-toggle" />

	<div class="drawer-content flex flex-col">
		<!-- Navbar -->
		<Navbar user={currentUser}>
			<SignOut />
		</Navbar>

		<!-- Page content -->
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>

	<!-- Sidebar -->
	<div class="drawer-side z-40">
		<label for="sidebar-mobile-nav" class="drawer-overlay"></label>
		<div class="bg-base-100 min-h-full w-80">
			<Sidebar />
		</div>
	</div>
</div>
