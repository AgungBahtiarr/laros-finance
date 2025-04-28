import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './server/db';
import { username } from 'better-auth/plugins';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$env/static/private';
import * as schema from '$lib/server/db/auth-schema';

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	url: BETTER_AUTH_URL,
	emailAndPassword: {
		enabled: true,
		autoSignIn: false
	},
	session: {
		storeSessionInDatabase: true
	},
	plugins: [username()],
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: schema
	})
});
