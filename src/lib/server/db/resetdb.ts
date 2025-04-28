import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { reset } from 'drizzle-seed';
import 'dotenv/config';

async function main() {
	try {
		await reset(drizzle(process.env.DATABASE_URL), schema);
		console.log('DB Vanished');
	} catch (error) {
		throw new Error(error);
	}
}

main();
