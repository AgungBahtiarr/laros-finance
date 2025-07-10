import { writable } from 'svelte/store';

type Theme = 'laros' | 'dark';

const userTheme = typeof localStorage !== 'undefined' && localStorage.getItem('theme');
export const theme = writable<Theme>(userTheme === 'dark' ? 'dark' : 'laros');

theme.subscribe((value) => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('theme', value);
		document.documentElement.setAttribute('data-theme', value);
	}
});
