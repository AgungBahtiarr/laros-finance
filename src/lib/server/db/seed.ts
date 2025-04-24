// src/lib/server/db/seed.ts
import { config } from 'dotenv';
import { db } from './index';
import { user, account } from './schema';
import { nanoid } from 'nanoid';
import { hash } from 'bcryptjs';

config();

const seed = async () => {
  const now = new Date();
  const userId = nanoid();

  await db.insert(user).values({
    id: userId,
    name: 'Admin',
    email: 'admin@laros.ae',
    emailVerified: false,
    username: 'admin',
    displayUsername: 'admin',
    createdAt: now,
    updatedAt: now
  });

  const hashedPassword = await hash('Larosndo12..', 10);

  await db.insert(account).values({
    id: nanoid(),
    accountId: 'admin',
    providerId: 'username',
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now
  });

  console.log('✅ Seeding selesai');
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

