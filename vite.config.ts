import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import 'dotenv/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
