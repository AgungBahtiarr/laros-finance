import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './server/db';
import { username } from 'better-auth/plugins';

export const auth = betterAuth({
	plugins: [username()],
	database: drizzleAdapter(db, {
		provider: 'sqlite'
	})
});
