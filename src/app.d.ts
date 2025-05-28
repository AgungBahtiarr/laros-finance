// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '$lib/server/db/schema';

// Import session type from your auth library
import type { Session } from '$lib/utils/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: NodePgDatabase<typeof schema>;
			user?: {
				id: string;
				email: string;
				name: string;
			};
			session?: Session;
		}
		interface PageData {
			user?: {
				id: string;
				email: string;
				name: string;
			};
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
