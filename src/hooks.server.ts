import { auth } from '$lib/auth';
import { type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	try {
		// Attach database to event.locals
		event.locals.db = db;

		// Handle authentication
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		if (session) {
			event.locals.user = session.user;
			event.locals.session = session.session;
		}

		return svelteKitHandler({ event, resolve, auth });
	} catch (error) {
		console.error('Hook error:', error);
		return resolve(event);
	}
};
