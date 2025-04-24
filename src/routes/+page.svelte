<script>
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { onMount } from 'svelte';

	onMount(() => {
		if (authClient.getSession()) {
			goto('/dashboard');
		} else {
			goto('/auth/login');
		}
	});
</script>
