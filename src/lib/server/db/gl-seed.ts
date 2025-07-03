import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL environment variable is not set');
	process.exit(1);
}

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

// Configure drizzle with schema
const db = drizzle(pool, { schema });

async function main() {
	try {
		// Create fiscal periods for the current year
		console.log('Seeding fiscal periods...');
		const currentYear = new Date().getFullYear();

		await db
			.insert(schema.fiscalPeriod)
			.values([
				{
					name: `${currentYear} - Januari`,
					month: 1,
					year: currentYear
				},
				{
					name: `${currentYear} - Februari`,
					month: 2,
					year: currentYear
				},
				{
					name: `${currentYear} - Maret`,
					month: 3,
					year: currentYear
				},
				{
					name: `${currentYear} - April`,
					month: 4,
					year: currentYear
				},
				{
					name: `${currentYear} - Mei`,
					month: 5,
					year: currentYear
				},
				{
					name: `${currentYear} - Juni`,
					month: 6,
					year: currentYear
				},
				{
					name: `${currentYear} - Juli`,
					month: 7,
					year: currentYear
				},
				{
					name: `${currentYear} - Agustus`,
					month: 8,
					year: currentYear
				},
				{
					name: `${currentYear} - September`,
					month: 9,
					year: currentYear
				},
				{
					name: `${currentYear} - Oktober`,
					month: 10,
					year: currentYear
				},
				{
					name: `${currentYear} - November`,
					month: 11,
					year: currentYear
				},
				{
					name: `${currentYear} - Desember`,
					month: 12,
					year: currentYear
				}
			])
			.onConflictDoNothing();

		// Add report templates
		console.log('Seeding report templates...');
		await db
			.insert(schema.reportTemplate)
			.values([
				{
					name: 'Neraca',
					type: 'BALANCE_SHEET',
					description: 'Laporan posisi keuangan perusahaan'
				},
				{
					name: 'Laba Rugi',
					type: 'INCOME_STATEMENT',
					description: 'Laporan kinerja keuangan perusahaan'
				},
				{
					name: 'Arus Kas',
					type: 'CASH_FLOW',
					description: 'Laporan arus kas perusahaan'
				}
			])
			.onConflictDoNothing();

		console.log('Seeding completed successfully!');
	} catch (error) {
		console.error('Error seeding data:', error);
		if (error instanceof Error) {
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);
		}
		process.exit(1);
	} finally {
		console.log('Closing database connection...');
		await pool.end();
		console.log('Database connection closed');
	}
}

main();
