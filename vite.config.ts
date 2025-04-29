import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import 'dotenv/config';

export default defineConfig({
	server: { origin: process.env.BETTER_AUTH_URL },
	plugins: [tailwindcss(), sveltekit()]
});
