import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  resultsPublic: z.boolean(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const [updated] = await db
    .update(editions)
    .set({
      resultsPublic: body.resultsPublic,
      updatedAt: new Date(),
    })
    .where(eq(editions.id, id))
    .returning();

  return updated;
});
