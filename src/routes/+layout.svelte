<script lang="ts">
	import '../app.css';
	import { theme } from '../lib/stores/themeStore';
	import ThemeToggle from '../lib/components/ThemeToggle.svelte';

	let { children } = $props();

	$effect(() => {
		document.documentElement.setAttribute('data-theme', $theme);
	});
</script>

{@render children()}

<style>
	:root {
		font-family: 'Inter', sans-serif;
	}
</style>
