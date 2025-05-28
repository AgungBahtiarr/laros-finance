import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './server/db';
import { username } from 'better-auth/plugins';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$env/static/private';
import * as schema from '$lib/server/db/auth-schema';
import { ImapFlow } from 'imapflow';
import { MAIL_URL } from '$env/static/private';

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

export async function verifyMailCredentials(email: string, password: string) {
	try {
		const client = new ImapFlow({
			host: MAIL_URL,
			port: 993,
			secure: true,
			auth: {
				user: email,
				pass: password
			}
		});

		await client.connect();

		const mailboxInfo = await client.getMailboxLock('INBOX');
		await mailboxInfo.release();
		await client.logout();

		return {
			success: true,
			user: {
				email,
				name: email.split('@')[0],
				password
			}
		};
	} catch (error) {
		if (error.code === 'EAUTH' || error.responseText?.includes('authentication failed')) {
			return { success: false, error: 'Invalid credentials' };
		} else if (error.code === 'ECONNREFUSED') {
			return { success: false, error: 'Mail server connection failed' };
		} else {
			return { success: false, error: 'Authentication failed' };
		}
	}
}
