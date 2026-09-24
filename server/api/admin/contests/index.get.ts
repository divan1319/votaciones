import { desc, count, eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { contests, editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const allContests = await db.select().from(contests).orderBy(desc(contests.createdAt));

  const results = await Promise.all(
    allContests.map(async (c) => {
      const [{ value }] = await db
        .select({ value: count() })
        .from(editions)
        .where(eq(editions.contestId, c.id));
      return {
        ...c,
        editionsCount: Number(value),
      };
    })
  );

  return results;
});
