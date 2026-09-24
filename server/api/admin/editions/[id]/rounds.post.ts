import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions, rounds } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1, 'El nombre de la ronda es obligatorio'),
  advanceMode: z.enum(['top_n', 'min_score']).default('top_n'),
  advanceValue: z.number().min(0.01, 'El valor de avance debe ser mayor a 0').default(5),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const [lastRound] = await db
    .select({ position: rounds.position })
    .from(rounds)
    .where(eq(rounds.editionId, id))
    .orderBy(desc(rounds.position))
    .limit(1);

  const nextPosition = lastRound ? lastRound.position + 1 : 1;

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const [newRound] = await db
    .insert(rounds)
    .values({
      editionId: id,
      name: body.name,
      position: nextPosition,
      advanceMode: body.advanceMode,
      advanceValue: body.advanceValue.toString(),
      status: 'pending',
    })
    .returning();

  return newRound;
});
