<script lang="ts">
	import { theme } from '../stores/themeStore';
	import { Moon, Sun } from '@lucide/svelte';

	function toggleTheme() {
		theme.update((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
	}
</script>

<label class="swap swap-rotate">
	<input type="checkbox" on:change={toggleTheme} checked={$theme === 'dark'} />
	<Sun class="swap-on h-6 w-6 fill-current" />
	<Moon class="swap-off h-6 w-6 fill-current" />
</label>
