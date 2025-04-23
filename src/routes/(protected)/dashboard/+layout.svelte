<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<!-- Bisa akses data.user dari layout.server -->
<div class="bg-base-200 p-4 text-sm text-gray-700">
	Halo, {data.user.username} 👋
	<a href="/auth/logout" class="link ml-4 text-blue-600">Logout</a>
</div>

{@render children()}
