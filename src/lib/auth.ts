import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './server/db';
import { username } from 'better-auth/plugins';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$env/static/private';

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	url: BETTER_AUTH_URL,
	emailAndPassword: {
		enabled: true
	},
	session: {
		storeSessionInDatabase: true,
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // 5 minutes
		}
	},
	plugins: [username()],
	database: drizzleAdapter(db, {
		provider: 'sqlite'
	})
});
