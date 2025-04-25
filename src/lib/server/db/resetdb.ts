import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { reset } from 'drizzle-seed';

//

async function main() {
	await reset(drizzle('local.db'), schema);
	console.log('DB Vanished');
}

main();
