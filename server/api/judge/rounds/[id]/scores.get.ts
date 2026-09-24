import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { scores } from '~~/server/db/schema';
import { requireJudge } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await requireJudge(event);
  const judgeId = session.user.id;
  const roundId = getRouterParam(event, 'id');
  if (!roundId) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const judgeScores = await db
    .select({
      participantId: scores.participantId,
      criterionId: scores.criterionId,
      value: scores.value,
    })
    .from(scores)
    .where(and(eq(scores.roundId, roundId), eq(scores.judgeId, judgeId)));

  // Retornar mapa anidado: participantId -> criterionId -> value
  const formatted: Record<string, Record<string, number>> = {};
  for (const s of judgeScores) {
    if (!formatted[s.participantId]) {
      formatted[s.participantId] = {};
    }
    formatted[s.participantId][s.criterionId] = Number(s.value);
  }

  return formatted;
});
