import { eq, asc, desc, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions, contests, rounds, participants, criteria, editionJudges, roundJudges, awards, user } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const [contest] = await db.select().from(contests).where(eq(contests.id, edition.contestId));

  const editionRounds = await db
    .select()
    .from(rounds)
    .where(eq(rounds.editionId, id))
    .orderBy(asc(rounds.position));

  const editionParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.editionId, id))
    .orderBy(asc(participants.code));

  const editionCriteria = await db
    .select()
    .from(criteria)
    .where(eq(criteria.editionId, id))
    .orderBy(asc(criteria.name));

  const editionAwards = await db
    .select()
    .from(awards)
    .where(eq(awards.editionId, id))
    .orderBy(desc(awards.createdAt));

  // Obtener jueces
  let judgesList: Array<{ id: string; name: string; email: string }> = [];
  if (edition.judgesScope === 'edition') {
    judgesList = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(editionJudges)
      .innerJoin(user, eq(editionJudges.userId, user.id))
      .where(eq(editionJudges.editionId, id));
  }

  return {
    ...edition,
    contest,
    rounds: editionRounds,
    participants: editionParticipants,
    criteria: editionCriteria,
    awards: editionAwards,
    judges: judgesList,
  };
});
