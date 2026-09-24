import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, editions, scores, judgeRoundSubmissions } from '~~/server/db/schema';
import { requireJudge } from '~~/server/utils/session';

const schema = z.object({
  scores: z.array(
    z.object({
      participantId: z.string(),
      criterionId: z.string(),
      value: z.number(),
    })
  ),
});

export default defineEventHandler(async (event) => {
  const session = await requireJudge(event);
  const judgeId = session.user.id;
  const roundId = getRouterParam(event, 'id');
  if (!roundId) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  // 1. REGLA DE INMUTABILIDAD ESTRICTA: Rechazar si ya fue enviada
  const [submission] = await db
    .select()
    .from(judgeRoundSubmissions)
    .where(and(eq(judgeRoundSubmissions.roundId, roundId), eq(judgeRoundSubmissions.judgeId, judgeId)))
    .limit(1);

  if (submission) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Inmutabilidad: Tus calificaciones para esta ronda ya han sido enviadas definitivamente y no pueden ser modificadas.',
    });
  }

  // 2. Verificar estado de la ronda
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw createError({ statusCode: 404, statusMessage: 'Ronda no encontrada' });
  if (round.status !== 'open') {
    throw createError({
      statusCode: 400,
      statusMessage: `No se pueden registrar calificaciones: la ronda se encuentra en estado "${round.status}".`,
    });
  }

  // 3. Obtener escala de la edición
  const [edition] = await db.select().from(editions).where(eq(editions.id, round.editionId));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const scaleMin = Number(edition.scaleMin);
  const scaleMax = Number(edition.scaleMax);

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  // 4. Validar rangos de escala
  for (const s of body.scores) {
    if (s.value < scaleMin || s.value > scaleMax) {
      throw createError({
        statusCode: 400,
        statusMessage: `El valor ${s.value} está fuera del rango permitido [${scaleMin} - ${scaleMax}].`,
      });
    }
  }

  // 5. Guardar o actualizar calificaciones (upsert en tabla scores)
  await db.transaction(async (tx) => {
    for (const item of body.scores) {
      await tx
        .insert(scores)
        .values({
          roundId,
          judgeId,
          participantId: item.participantId,
          criterionId: item.criterionId,
          value: item.value.toString(),
        })
        .onConflictDoUpdate({
          target: [scores.roundId, scores.judgeId, scores.participantId, scores.criterionId],
          set: {
            value: item.value.toString(),
          },
        });
    }
  });

  return { success: true, count: body.scores.length };
});
