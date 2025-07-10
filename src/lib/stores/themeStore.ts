import { writable } from 'svelte/store';

type Theme = 'light' | 'dark';

const userTheme = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
export const theme = writable<Theme>(userTheme === 'dark' ? 'dark' : 'light');

theme.subscribe((value) => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('theme', value);
		document.documentElement.setAttribute('data-theme', value);
	}
});
