import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { config } from 'dotenv';
//import { env } from '$env/dynamic/private';

config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is not set');

const client = new Database(dbUrl);

export const db = drizzle(client, { schema });
