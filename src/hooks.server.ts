import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth as betterAuth } from '$lib/auth';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

const betterAuthHandler = (async ({ event, resolve }) => {
	return svelteKitHandler({
		event,
		resolve,
		auth: betterAuth
	});
}) satisfies Handle;

const betterAuthSessionHandler = (async ({ event, resolve }) => {
	const session = await betterAuth.api.getSession({
		headers: event.request.headers
	});
	event.locals.session = session?.session;
	event.locals.user = session?.user;

	return resolve(event);
}) satisfies Handle;

export const handle = sequence(betterAuthHandler, betterAuthSessionHandler) satisfies Handle;
