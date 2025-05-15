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
					startDate: new Date(`${currentYear}-01-01`),
					endDate: new Date(`${currentYear}-01-31`)
				},
				{
					name: `${currentYear} - Februari`,
					startDate: new Date(`${currentYear}-02-01`),
					endDate: new Date(`${currentYear}-02-${currentYear % 4 === 0 ? '29' : '28'}`)
				},
				{
					name: `${currentYear} - Maret`,
					startDate: new Date(`${currentYear}-03-01`),
					endDate: new Date(`${currentYear}-03-31`)
				},
				{
					name: `${currentYear} - April`,
					startDate: new Date(`${currentYear}-04-01`),
					endDate: new Date(`${currentYear}-04-30`)
				},
				{
					name: `${currentYear} - Mei`,
					startDate: new Date(`${currentYear}-05-01`),
					endDate: new Date(`${currentYear}-05-31`)
				},
				{
					name: `${currentYear} - Juni`,
					startDate: new Date(`${currentYear}-06-01`),
					endDate: new Date(`${currentYear}-06-30`)
				},
				{
					name: `${currentYear} - Juli`,
					startDate: new Date(`${currentYear}-07-01`),
					endDate: new Date(`${currentYear}-07-31`)
				},
				{
					name: `${currentYear} - Agustus`,
					startDate: new Date(`${currentYear}-08-01`),
					endDate: new Date(`${currentYear}-08-31`)
				},
				{
					name: `${currentYear} - September`,
					startDate: new Date(`${currentYear}-09-01`),
					endDate: new Date(`${currentYear}-09-30`)
				},
				{
					name: `${currentYear} - Oktober`,
					startDate: new Date(`${currentYear}-10-01`),
					endDate: new Date(`${currentYear}-10-31`)
				},
				{
					name: `${currentYear} - November`,
					startDate: new Date(`${currentYear}-11-01`),
					endDate: new Date(`${currentYear}-11-30`)
				},
				{
					name: `${currentYear} - Desember`,
					startDate: new Date(`${currentYear}-12-01`),
					endDate: new Date(`${currentYear}-12-31`)
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
