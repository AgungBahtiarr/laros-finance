import { relations } from 'drizzle-orm';
import { pgTable, serial, text, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
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
	kode: varchar('kode', { length: 100 }),
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
