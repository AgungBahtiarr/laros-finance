import { auth } from '$lib/auth';
import { type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';

export const handle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.user = session?.user;
	event.locals.session = session?.session;

	return svelteKitHandler({ event, resolve, auth });
};
