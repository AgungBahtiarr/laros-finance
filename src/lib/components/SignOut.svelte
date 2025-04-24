<script>
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
    
	const logout = () => {
		authClient.signOut();
		console.log('berhasil keluar');
		goto('/auth/login');
	};
</script>

<button onclick={logout} aria-label="Sign out">Sign out</button>
