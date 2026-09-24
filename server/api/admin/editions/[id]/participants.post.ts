import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { participants, rounds, roundParticipants } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  code: z.string().min(1, 'El código/número es obligatorio'),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const result = await db.transaction(async (tx) => {
    // 1. Insertar participante
    const [newPart] = await tx
      .insert(participants)
      .values({
        editionId: id,
        name: body.name,
        code: body.code,
        status: 'active',
      })
      .returning();

    // 2. Si la ronda 1 existe y está en pending o open, agregarla a round_participants
    const [firstRound] = await tx
      .select()
      .from(rounds)
      .where(eq(rounds.editionId, id))
      .orderBy(asc(rounds.position))
      .limit(1);

    if (firstRound && firstRound.status !== 'closed') {
      await tx
        .insert(roundParticipants)
        .values({
          roundId: firstRound.id,
          participantId: newPart.id,
        })
        .onConflictDoNothing();
    }

    return newPart;
  });

  return result;
});
