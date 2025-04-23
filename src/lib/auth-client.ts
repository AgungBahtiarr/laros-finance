import { createAuthClient } from 'better-auth/svelte';
import { env } from '$env/dynamic/private';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	baseURL: env.BETTER_AUTH_URL,
	plugins: [usernameClient()]
});
