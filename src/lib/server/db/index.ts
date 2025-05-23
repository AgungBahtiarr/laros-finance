import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DATABASE_URL } from '$env/static/private';

// Create postgres connection pool
const pool = new Pool({
	connectionString: DATABASE_URL
});

// Create drizzle database instance
export const db = drizzle(pool, { schema });
