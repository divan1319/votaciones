import { eq, and, inArray, asc } from 'drizzle-orm';
import { db } from '~~/server/db';
import { rounds, editions, contests, editionJudges, roundJudges, judgeRoundSubmissions } from '~~/server/db/schema';
import { requireJudge } from '~~/server/utils/session';

export default defineEventHandler(async (event) => {
  const session = await requireJudge(event);
  const judgeId = session.user.id;

  // 1. Rondas por edition_judges
  const userEditionIds = await db
    .select({ editionId: editionJudges.editionId })
    .from(editionJudges)
    .where(eq(editionJudges.userId, judgeId));

  const editionIds = userEditionIds.map((e) => e.editionId);

  // 2. Rondas por round_judges
  const userRoundIds = await db
    .select({ roundId: roundJudges.roundId })
    .from(roundJudges)
    .where(eq(roundJudges.userId, judgeId));

  const directRoundIds = userRoundIds.map((r) => r.roundId);

  // 3. Obtener todas las rondas aplicables
  const allApplicableRounds = await db
    .select({
      round: rounds,
      edition: editions,
      contest: contests,
    })
    .from(rounds)
    .innerJoin(editions, eq(rounds.editionId, editions.id))
    .innerJoin(contests, eq(editions.contestId, contests.id))
    .where(
      editionIds.length > 0 && directRoundIds.length > 0
        ? inArray(rounds.id, directRoundIds) // o pertenece a edición
        : editionIds.length > 0
        ? inArray(rounds.editionId, editionIds)
        : directRoundIds.length > 0
        ? inArray(rounds.id, directRoundIds)
        : eq(rounds.id, '__none__')
    )
    .orderBy(asc(rounds.position));

  // 4. Verificar qué rondas ya fueron enviadas por este juez
  const submissions = await db
    .select()
    .from(judgeRoundSubmissions)
    .where(eq(judgeRoundSubmissions.judgeId, judgeId));

  const submittedRoundIds = new Set(submissions.map((s) => s.roundId));

  return allApplicableRounds.map(({ round, edition, contest }) => {
    const isSubmitted = submittedRoundIds.has(round.id);
    const sub = submissions.find((s) => s.roundId === round.id);

    return {
      roundId: round.id,
      roundName: round.name,
      roundPosition: round.position,
      roundStatus: round.status,
      editionId: edition.id,
      editionName: edition.name,
      contestName: contest.name,
      scaleMin: Number(edition.scaleMin),
      scaleMax: Number(edition.scaleMax),
      isSubmitted,
      submittedAt: sub ? sub.submittedAt : null,
    };
  });
});
