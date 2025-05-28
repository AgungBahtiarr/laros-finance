<script>
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/utils/auth-client';
	import { onMount } from 'svelte';

	onMount(async () => {
		const session = await authClient.getSession();
		if (session.data) {
			goto('/dashboard');
		} else {
			goto('/auth/login');
		}
	});
</script>
