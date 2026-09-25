import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions, rounds, scores, criteria } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(1).optional(),
  scoringMethod: z.enum(['average', 'sum']).optional(),
  accumulateRounds: z.boolean().optional(),
  criteriaScope: z.enum(['edition', 'round']).optional(),
  judgesScope: z.enum(['edition', 'round']).optional(),
  scaleMin: z.number().optional(),
  scaleMax: z.number().optional(),
  resultsPublic: z.boolean().optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [existingEdition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!existingEdition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  // Verificar si ya existen calificaciones en alguna ronda de la edición
  const editionRounds = await db.select({ id: rounds.id }).from(rounds).where(eq(rounds.editionId, id));
  const roundIds = editionRounds.map((r) => r.id);

  let hasScores = false;
  if (roundIds.length > 0) {
    const [scoreCount] = await db.select().from(scores).where(inArray(scores.roundId, roundIds)).limit(1);
    hasScores = !!scoreCount;
  }

  if (hasScores) {
    if (
      (body.criteriaScope && body.criteriaScope !== existingEdition.criteriaScope) ||
      (body.judgesScope && body.judgesScope !== existingEdition.judgesScope) ||
      (body.scaleMin !== undefined && body.scaleMin.toString() !== existingEdition.scaleMin) ||
      (body.scaleMax !== undefined && body.scaleMax.toString() !== existingEdition.scaleMax)
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No se puede modificar criteria_scope, judges_scope ni la escala porque la edición ya tiene calificaciones registradas.',
      });
    }
  }

  const [updatedEdition] = await db
    .update(editions)
    .set({
      name: body.name ?? existingEdition.name,
      scoringMethod: body.scoringMethod ?? existingEdition.scoringMethod,
      accumulateRounds: body.accumulateRounds ?? existingEdition.accumulateRounds,
      criteriaScope: body.criteriaScope ?? existingEdition.criteriaScope,
      judgesScope: body.judgesScope ?? existingEdition.judgesScope,
      scaleMin: body.scaleMin !== undefined ? body.scaleMin.toString() : existingEdition.scaleMin,
      scaleMax: body.scaleMax !== undefined ? body.scaleMax.toString() : existingEdition.scaleMax,
      resultsPublic: body.resultsPublic ?? existingEdition.resultsPublic,
      updatedAt: new Date(),
    })
    .where(eq(editions.id, id))
    .returning();

  if (body.criteriaScope === 'edition') {
    // Si cambia a general, unificar criterios a roundId = null
    await db.update(criteria).set({ roundId: null }).where(eq(criteria.editionId, id));
  }

  return updatedEdition;
});
