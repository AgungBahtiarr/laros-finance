import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { reset } from 'drizzle-seed';
import 'dotenv/config';

//

async function main() {
	await reset(drizzle(process.env.DATABASE_URL), schema);
	console.log('DB Vanished');
}

main();
