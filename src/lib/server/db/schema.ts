import { relations } from 'drizzle-orm';
import {
	pgTable,
	serial,
	text,
	varchar,
	integer,
	boolean,
	timestamp,
	date,
	decimal
} from 'drizzle-orm/pg-core';
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	username: text('username').unique(),
	displayUsername: text('display_username')
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at')
});

export const jenisHarta = pgTable('jenis_harta', {
	id: serial('id').primaryKey(),
	keterangan: varchar('keterangan', { length: 255 }).notNull(),
	daftar: text('daftar').notNull()
});

export const kelompokHarta = pgTable('kelompok_harta', {
	id: serial('id').primaryKey(),
	keterangan: varchar('keterangan', { length: 255 }).notNull(),
	jenis: varchar('jenis', { length: 100 }).notNull()
});

export const metodePenyusutanKomersial = pgTable('metode_penyusutan_komersial', {
	id: serial('id').primaryKey(),
	keterangan: varchar('keterangan', { length: 255 }).notNull()
});

export const metodePenyusutanFiskal = pgTable('metode_penyusutan_fiskal', {
	id: serial('id').primaryKey(),
	keterangan: varchar('keterangan', { length: 255 }).notNull()
});

export const asset = pgTable('asset', {
	id: serial('id').primaryKey(),
	jenisHartaId: integer('jenis_harta_id').notNull(),
	kelompokHartaId: integer('kelompok_harta_id').notNull(),
	jenisUsaha: varchar('jenis_usaha', { length: 255 }).notNull(),
	namaHarta: varchar('nama_harta', { length: 255 }).notNull(),
	bulanPerolehan: integer('bulan_perolehan').notNull(),
	tahunPerolehan: integer('tahun_perolehan').notNull(),
	metodePenyusutanKomersialId: integer('metode_penyusutan_komersial_id').notNull(),
	metodePenyusutanFiskalId: integer('metode_penyusutan_fiskal_id').notNull(),
	hargaPerolehan: integer('harga_perolehan').notNull(),
	nilaiSisaBuku: integer('nilai_sisa_buku').notNull(),
	penyusutanFiskalTahunIni: integer('penyusutan_fiskal_tahun_ini').notNull(),
	keterangan: text('keterangan'),
	lokasi: text('lokasi'),
	imageUrl: varchar('image_url'),
	kode: varchar('kode', { length: 100 }),
	qty: integer('qty').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const assetRelations = relations(asset, ({ one }) => ({
	jenisHarta: one(jenisHarta, {
		fields: [asset.jenisHartaId],
		references: [jenisHarta.id]
	}),
	kelompokHarta: one(kelompokHarta, {
		fields: [asset.kelompokHartaId],
		references: [kelompokHarta.id]
	}),
	metodePenyusutanKomersial: one(metodePenyusutanKomersial, {
		fields: [asset.metodePenyusutanKomersialId],
		references: [metodePenyusutanKomersial.id]
	}),
	metodePenyusutanFiskal: one(metodePenyusutanFiskal, {
		fields: [asset.metodePenyusutanFiskalId],
		references: [metodePenyusutanFiskal.id]
	})
}));

export const jenisHartaRelations = relations(jenisHarta, ({ many }) => ({
	assets: many(asset)
}));

export const kelompokHartaRelations = relations(kelompokHarta, ({ many }) => ({
	assets: many(asset)
}));

export const metodePenyusutanKomersialRelations = relations(
	metodePenyusutanKomersial,
	({ many }) => ({
		assets: many(asset)
	})
);

export const metodePenyusutanFiskalRelations = relations(metodePenyusutanFiskal, ({ many }) => ({
	assets: many(asset)
}));

// General Ledger Schema

// Account Types (Asset, Liability, Equity, Revenue, Expense)
export const accountType = pgTable('account_type', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 20 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull(),
	balanceType: varchar('balance_type', { length: 10 }).notNull(), // "DEBIT" or "CREDIT"
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Account Groups
export const accountGroup = pgTable('account_group', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 20 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull(),
	accountTypeId: integer('account_type_id')
		.notNull()
		.references(() => accountType.id),
	description: text('description'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Chart of Accounts
export const chartOfAccount = pgTable('chart_of_account', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 20 }).notNull().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	accountGroupId: integer('account_group_id')
		.notNull()
		.references(() => accountGroup.id),
	parentId: integer('parent_id').references(() => chartOfAccount.id),
	level: integer('level').notNull().default(1),
	isActive: boolean('is_active').notNull().default(true),
	isLocked: boolean('is_locked').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const chartOfAccountRelations = relations(chartOfAccount, ({ one, many }) => ({
	accountGroup: one(accountGroup, {
		fields: [chartOfAccount.accountGroupId],
		references: [accountGroup.id]
	}),
	parent: one(chartOfAccount, {
		fields: [chartOfAccount.parentId],
		references: [chartOfAccount.id]
	}),
	children: many(chartOfAccount),
	journalEntryLines: many(journalEntryLine)
}));

export const accountTypeRelations = relations(accountType, ({ many }) => ({
	groups: many(accountGroup)
}));

export const accountGroupRelations = relations(accountGroup, ({ one, many }) => ({
	accountType: one(accountType, {
		fields: [accountGroup.accountTypeId],
		references: [accountType.id]
	}),
	accounts: many(chartOfAccount)
}));

// Fiscal Periods
export const fiscalPeriod = pgTable('fiscal_period', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	startDate: date('start_date').notNull(),
	endDate: date('end_date').notNull(),
	isClosed: boolean('is_closed').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Journal Entries
export const journalEntry = pgTable('journal_entry', {
	id: serial('id').primaryKey(),
	number: varchar('number', { length: 50 }).notNull().unique(),
	date: date('date').notNull(),
	description: text('description'),
	reference: varchar('reference', { length: 100 }),
	fiscalPeriodId: integer('fiscal_period_id')
		.notNull()
		.references(() => fiscalPeriod.id),
	totalDebit: decimal('total_debit', { precision: 15, scale: 2 }).notNull().default('0'),
	totalCredit: decimal('total_credit', { precision: 15, scale: 2 }).notNull().default('0'),
	status: varchar('status', { length: 20 }).notNull().default('DRAFT'), // DRAFT, POSTED, REVERSED
	postedAt: timestamp('posted_at'),
	isBhp: boolean('is_bhp').default(false),
	postedBy: text('posted_by').references(() => user.id),
	createdBy: text('created_by')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const journalEntryRelations = relations(journalEntry, ({ one, many }) => ({
	fiscalPeriod: one(fiscalPeriod, {
		fields: [journalEntry.fiscalPeriodId],
		references: [fiscalPeriod.id]
	}),
	createdByUser: one(user, {
		fields: [journalEntry.createdBy],
		references: [user.id]
	}),
	postedByUser: one(user, {
		fields: [journalEntry.postedBy],
		references: [user.id]
	}),
	lines: many(journalEntryLine)
}));

export const fiscalPeriodRelations = relations(fiscalPeriod, ({ many }) => ({
	journalEntries: many(journalEntry)
}));

// Journal Entry Lines
export const journalEntryLine = pgTable('journal_entry_line', {
	id: serial('id').primaryKey(),
	journalEntryId: integer('journal_entry_id')
		.notNull()
		.references(() => journalEntry.id, { onDelete: 'cascade' }),
	accountId: integer('account_id')
		.notNull()
		.references(() => chartOfAccount.id),
	description: text('description'),
	debitAmount: decimal('debit_amount', { precision: 15, scale: 2 }).notNull().default('0'),
	creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }).notNull().default('0'),
	lineNumber: integer('line_number').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const journalEntryLineRelations = relations(journalEntryLine, ({ one }) => ({
	journalEntry: one(journalEntry, {
		fields: [journalEntryLine.journalEntryId],
		references: [journalEntry.id]
	}),
	account: one(chartOfAccount, {
		fields: [journalEntryLine.accountId],
		references: [chartOfAccount.id]
	})
}));

// Financial Report Templates
export const reportTemplate = pgTable('report_template', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	type: varchar('type', { length: 50 }).notNull(), // BALANCE_SHEET, INCOME_STATEMENT, CASH_FLOW, etc.
	description: text('description'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Report Template Lines - defines the structure of the report
export const reportTemplateLine = pgTable('report_template_line', {
	id: serial('id').primaryKey(),
	reportTemplateId: integer('report_template_id')
		.notNull()
		.references(() => reportTemplate.id, { onDelete: 'cascade' }),
	lineNumber: integer('line_number').notNull(),
	parentLineId: integer('parent_line_id').references(() => reportTemplateLine.id),
	label: varchar('label', { length: 255 }).notNull(),
	type: varchar('type', { length: 20 }).notNull(), // HEADER, ACCOUNT, CALCULATION, TOTAL, SUBTOTAL
	formula: text('formula'), // For calculation lines
	accountIds: text('account_ids'), // CSV of account IDs, for ACCOUNT type
	bold: boolean('bold').notNull().default(false),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const reportTemplateRelations = relations(reportTemplate, ({ many }) => ({
	lines: many(reportTemplateLine)
}));

export const reportTemplateLineRelations = relations(reportTemplateLine, ({ one, many }) => ({
	reportTemplate: one(reportTemplate, {
		fields: [reportTemplateLine.reportTemplateId],
		references: [reportTemplate.id]
	}),
	parent: one(reportTemplateLine, {
		fields: [reportTemplateLine.parentLineId],
		references: [reportTemplateLine.id]
	}),
	children: many(reportTemplateLine)
}));

// Recurring Journal Templates
export const recurringJournalTemplate = pgTable('recurring_journal_template', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	description: text('description'),
	frequency: varchar('frequency', { length: 20 }).notNull(), // MONTHLY, QUARTERLY, YEARLY, etc.
	nextRunDate: date('next_run_date').notNull(),
	isActive: boolean('is_active').notNull().default(true),
	createdBy: text('created_by')
		.notNull()
		.references(() => user.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Recurring Journal Template Lines
export const recurringJournalTemplateLine = pgTable('recurring_journal_template_line', {
	id: serial('id').primaryKey(),
	recurringJournalTemplateId: integer('recurring_journal_template_id')
		.notNull()
		.references(() => recurringJournalTemplate.id, { onDelete: 'cascade' }),
	accountId: integer('account_id')
		.notNull()
		.references(() => chartOfAccount.id),
	description: text('description'),
	debitAmount: decimal('debit_amount', { precision: 15, scale: 2 }).notNull().default('0'),
	creditAmount: decimal('credit_amount', { precision: 15, scale: 2 }).notNull().default('0'),
	lineNumber: integer('line_number').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const recurringJournalTemplateRelations = relations(
	recurringJournalTemplate,
	({ one, many }) => ({
		createdByUser: one(user, {
			fields: [recurringJournalTemplate.createdBy],
			references: [user.id]
		}),
		lines: many(recurringJournalTemplateLine)
	})
);

export const recurringJournalTemplateLineRelations = relations(
	recurringJournalTemplateLine,
	({ one }) => ({
		recurringJournalTemplate: one(recurringJournalTemplate, {
			fields: [recurringJournalTemplateLine.recurringJournalTemplateId],
			references: [recurringJournalTemplate.id]
		}),
		account: one(chartOfAccount, {
			fields: [recurringJournalTemplateLine.accountId],
			references: [chartOfAccount.id]
		})
	})
);
