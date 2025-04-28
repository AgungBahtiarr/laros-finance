import { relations } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	username: text('username').unique(),
	displayUsername: text('display_username')
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
});

export const jenisHarta = sqliteTable('jenis_harta', {
	id: integer('id').primaryKey(),
	keterangan: text('keterangan').notNull(),
	daftar: text('daftar').notNull()
});

// Tabel untuk Kelompok Harta
export const kelompokHarta = sqliteTable('kelompok_harta', {
	id: integer('id').primaryKey(),
	kode: integer('kode').notNull(),
	keterangan: text('keterangan').notNull(),
	jenis: text('jenis').notNull()
});

// Tabel untuk Metode Penyusutan Komersial
export const metodePenyusutanKomersial = sqliteTable('metode_penyusutan_komersial', {
	id: integer('id').primaryKey(),
	kode: integer('kode').notNull(),
	keterangan: text('keterangan').notNull()
});

// Tabel untuk Metode Penyusutan Fiskal
export const metodePenyusutanFiskal = sqliteTable('metode_penyusutan_fiskal', {
	id: integer('id').primaryKey(),
	kode: integer('kode').notNull(),
	keterangan: text('keterangan').notNull()
});

// Tabel utama untuk Asset
export const asset = sqliteTable('asset', {
	id: integer('id').primaryKey(),
	jenisHartaId: integer('jenis_harta_id').notNull(),
	kelompokHartaId: integer('kelompok_harta_id').notNull(),
	jenisUsaha: text('jenis_usaha').notNull(),
	namaHarta: text('nama_harta').notNull(),
	bulanPerolehan: integer('bulan_perolehan').notNull(),
	tahunPerolehan: integer('tahun_perolehan').notNull(),
	metodePenyusutanKomersialId: integer('metode_penyusutan_komersial_id').notNull(),
	metodePenyusutanFiskalId: integer('metode_penyusutan_fiskal_id').notNull(),
	hargaPerolehan: integer('harga_perolehan').notNull(),
	nilaiSisaBuku: integer('nilai_sisa_buku').notNull(),
	penyusutanFiskalTahunIni: integer('penyusutan_fiskal_tahun_ini').notNull(),
	keterangan: text('keterangan'),
	lokasi: text('lokasi'),
	kode: text('kode'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().defaultNow(),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().defaultNow()
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

// Relations for JenisHarta
export const jenisHartaRelations = relations(jenisHarta, ({ many }) => ({
	assets: many(asset)
}));

// Relations for KelompokHarta
export const kelompokHartaRelations = relations(kelompokHarta, ({ many }) => ({
	assets: many(asset)
}));

// Relations for MetodePenyusutanKomersial
export const metodePenyusutanKomersialRelations = relations(
	metodePenyusutanKomersial,
	({ many }) => ({
		assets: many(asset)
	})
);

// Relations for MetodePenyusutanFiskal
export const metodePenyusutanFiskalRelations = relations(metodePenyusutanFiskal, ({ many }) => ({
	assets: many(asset)
}));
