import { z } from 'zod';
import { db } from '~~/server/db';
import { editions, rounds } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1, 'El nombre/año de la edición es requerido'),
  criteriaScope: z.enum(['edition', 'round']).default('edition'),
  judgesScope: z.enum(['edition', 'round']).default('edition'),
  scoringMethod: z.enum(['average', 'sum']).default('average'),
  accumulateRounds: z.boolean().default(false),
  scaleMin: z.number().default(1),
  scaleMax: z.number().default(10),
  resultsPublic: z.boolean().default(false),
  advanceMode: z.enum(['top_n', 'min_score']).default('top_n'),
  advanceValue: z.number().default(1), // Por defecto 1 ganadora
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const contestId = getRouterParam(event, 'id');
  if (!contestId) throw createError({ statusCode: 400, statusMessage: 'ID de concurso requerido' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  if (body.scaleMax <= body.scaleMin) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La escala máxima debe ser estrictamente mayor que la escala mínima',
    });
  }

  const result = await db.transaction(async (tx) => {
    const [newEdition] = await tx
      .insert(editions)
      .values({
        contestId,
        name: body.name,
        criteriaScope: body.criteriaScope,
        judgesScope: body.judgesScope,
        scoringMethod: body.scoringMethod,
        accumulateRounds: body.accumulateRounds,
        scaleMin: body.scaleMin.toString(),
        scaleMax: body.scaleMax.toString(),
        resultsPublic: body.resultsPublic,
      })
      .returning();

    // Las rondas siempre existen: crear la ronda única "Final" por defecto
    const [defaultRound] = await tx
      .insert(rounds)
      .values({
        editionId: newEdition.id,
        name: 'Final',
        position: 1,
        advanceMode: body.advanceMode,
        advanceValue: body.advanceValue.toString(),
        status: 'pending',
      })
      .returning();

    return {
      edition: newEdition,
      round: defaultRound,
    };
  });

  return result;
});
