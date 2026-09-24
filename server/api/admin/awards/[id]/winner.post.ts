import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { awards, awardWinners } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  participantId: z.string(),
});

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event);
  const awardId = getRouterParam(event, 'id');
  if (!awardId) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [award] = await db.select().from(awards).where(eq(awards.id, awardId));
  if (!award) throw createError({ statusCode: 404, statusMessage: 'Premio no encontrado' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  await db
    .insert(awardWinners)
    .values({
      awardId,
      participantId: body.participantId,
      decidedBy: session.user.id,
    })
    .onConflictDoNothing();

  return { success: true };
});
