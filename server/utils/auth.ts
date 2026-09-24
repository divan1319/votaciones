import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { db } from '../db';
import * as schema from '../db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: 'judge',
      adminRole: 'admin',
    }),
  ],
  secret: process.env.BETTER_AUTH_SECRET || 'votaciones-super-secret-key-32-characters-min',
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
});
