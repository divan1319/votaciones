import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../server/db';
import {
  contests,
  editions,
  rounds,
  participants,
  roundParticipants,
  editionJudges,
  criteria,
  scores,
  judgeRoundSubmissions,
  roundResults,
  awards,
  awardCriteria,
  awardMetrics,
  awardWinners,
  user,
} from '../server/db/schema';
import { calculateRoundResults, closeRound } from '../server/services/scoring';
import { calculateSpecialAwards, setAwardWinner } from '../server/services/awards';
import { auth } from '../server/utils/auth';

async function runEndToEndSimulation() {
  console.log('🚀 Iniciando Simulación End-to-End del Certamen...');

  // 1. Limpieza de datos previos del test
  const [existingContest] = await db
    .select()
    .from(contests)
    .where(eq(contests.name, 'Certamen Nacional de Belleza 2026 Test'));

  if (existingContest) {
    await db.delete(contests).where(eq(contests.id, existingContest.id));
    console.log('🧹 Limpieza de simulación previa completada.');
  }

  // 2. Crear Concurso
  const [contest] = await db
    .insert(contests)
    .values({
      name: 'Certamen Nacional de Belleza 2026 Test',
      description: 'Concurso de prueba integral para verificación de reglas del sistema',
    })
    .returning();
  console.log('✓ Concurso creado:', contest.name);

  // 3. Crear Edición con acumulado activo y escala 1-10
  const [edition] = await db
    .insert(editions)
    .values({
      contestId: contest.id,
      name: '2026',
      status: 'active',
      criteriaScope: 'edition',
      judgesScope: 'edition',
      scoringMethod: 'average',
      accumulateRounds: true,
      scaleMin: '1.00',
      scaleMax: '10.00',
      resultsPublic: false,
    })
    .returning();
  console.log('✓ Edición creada:', edition.name);

  // 4. Crear 2 Rondas: Preliminar (Top 2 clasifican) y Final (Top 1 gana)
  const [round1] = await db
    .insert(rounds)
    .values({
      editionId: edition.id,
      name: 'Ronda Preliminar',
      position: 1,
      advanceMode: 'top_n',
      advanceValue: '2.00', // Avanzan las 2 primeras
      status: 'pending',
    })
    .returning();

  const [round2] = await db
    .insert(rounds)
    .values({
      editionId: edition.id,
      name: 'Ronda Final',
      position: 2,
      advanceMode: 'top_n',
      advanceValue: '1.00', // Gana la 1ra
      status: 'pending',
    })
    .returning();
  console.log('✓ Rondas creadas: 1. Preliminar (Top 2), 2. Final (Top 1)');

  // 5. Criterios de evaluación (suman exactamente 100%)
  const [crit1] = await db
    .insert(criteria)
    .values({ editionId: edition.id, name: 'Belleza y Elegancia', weight: '40.00' })
    .returning();
  const [crit2] = await db
    .insert(criteria)
    .values({ editionId: edition.id, name: 'Pasarela y Porte', weight: '30.00' })
    .returning();
  const [crit3] = await db
    .insert(criteria)
    .values({ editionId: edition.id, name: 'Entrevista y Cultura', weight: '30.00' })
    .returning();
  console.log('✓ Criterios configurados: 40% + 30% + 30% = 100%');

  // 6. Participantes (4 candidatas)
  const [p1] = await db
    .insert(participants)
    .values({ editionId: edition.id, code: '01', name: 'Valeria Gómez', status: 'active' })
    .returning();
  const [p2] = await db
    .insert(participants)
    .values({ editionId: edition.id, code: '02', name: 'Sofía Martínez', status: 'active' })
    .returning();
  const [p3] = await db
    .insert(participants)
    .values({ editionId: edition.id, code: '03', name: 'Camila Torres', status: 'active' })
    .returning();
  const [p4] = await db
    .insert(participants)
    .values({ editionId: edition.id, code: '04', name: 'Isabella Morales', status: 'active' })
    .returning();
  console.log('✓ 4 Participantes registradas (01, 02, 03, 04)');

  // 7. Jueces Calificadores (3 jueces)
  const judgeUsers = [];
  for (let i = 1; i <= 3; i++) {
    const email = `juez_test_${i}@concurso.com`;
    let [u] = await db.select().from(user).where(eq(user.email, email));
    if (!u) {
      const res = await auth.api.createUser({
        body: { email, password: 'Password123!', name: `Juez Test ${i}`, role: 'judge' },
      });
      u = res.user as any;
    }
    judgeUsers.push(u);
    await db.insert(editionJudges).values({ editionId: edition.id, userId: u.id }).onConflictDoNothing();
  }
  console.log('✓ 3 Jueces asignados a la edición');

  // 8. Crear Premios Especiales
  const [awardSocial] = await db
    .insert(awards)
    .values({
      editionId: edition.id,
      name: 'Miss Redes Sociales',
      type: 'metric',
      metricLabel: 'Votos',
      winnersCount: 1,
    })
    .returning();

  const [awardElegance] = await db
    .insert(awards)
    .values({
      editionId: edition.id,
      name: 'Mejor Pasarela',
      type: 'criterion',
      winnersCount: 1,
    })
    .returning();

  await db.insert(awardCriteria).values({ awardId: awardElegance.id, criterionId: crit2.id });
  console.log('✓ Premios especiales creados: Miss Redes Sociales (métrica) y Mejor Pasarela (criterio)');

  // 9. ABRIR RONDA 1 (Preliminar)
  // Insertar participantes a la ronda 1
  for (const p of [p1, p2, p3, p4]) {
    await db.insert(roundParticipants).values({ roundId: round1.id, participantId: p.id }).onConflictDoNothing();
  }
  await db.update(rounds).set({ status: 'open' }).where(eq(rounds.id, round1.id));
  console.log('✓ Ronda 1 abierta para votación');

  // 10. CALIFICAR: Juez 1 y Juez 2 califican a todos. Juez 3 NO envía (Juez faltante).
  // Provocamos a propósito un EMPATE en el puesto 2 (la frontera de corte para top_n=2) entre Sofía (02) y Camila (03):
  // Valeria (01): notas altas (10, 10, 10)
  // Sofía (02): notas medias (8, 8, 8)
  // Camila (03): notas medias idénticas a Sofía (8, 8, 8) -> EMPATE EXACTO EN EL CORTE!
  // Isabella (04): notas bajas (5, 5, 5)

  for (const j of [judgeUsers[0], judgeUsers[1]]) {
    // p1
    for (const c of [crit1, crit2, crit3]) {
      await db.insert(scores).values({ roundId: round1.id, judgeId: j.id, participantId: p1.id, criterionId: c.id, value: '10.00' });
      await db.insert(scores).values({ roundId: round1.id, judgeId: j.id, participantId: p2.id, criterionId: c.id, value: '8.00' });
      await db.insert(scores).values({ roundId: round1.id, judgeId: j.id, participantId: p3.id, criterionId: c.id, value: '8.00' });
      await db.insert(scores).values({ roundId: round1.id, judgeId: j.id, participantId: p4.id, criterionId: c.id, value: '5.00' });
    }
    // Registrar envío de Juez 1 y 2
    await db.insert(judgeRoundSubmissions).values({ roundId: round1.id, judgeId: j.id, submittedAt: new Date() });
  }
  console.log('✓ Juez 1 y Juez 2 completaron y enviaron sus calificaciones (Juez 3 ausente)');

  // 11. VERIFICAR DETECCIÓN DE EMPATE CRÍTICO
  const calc1 = await calculateRoundResults(round1.id);
  console.log(`📊 Cálculo preliminar Ronda 1:`);
  console.log(`   - Jueces enviados: ${calc1.submittedJudgesCount}, Jueces ausentes: ${calc1.missingJudgesCount}`);
  console.log(`   - ¿Detectó empate crítico en el corte?: ${calc1.hasCriticalTie} (${calc1.criticalTieMessage})`);

  if (!calc1.hasCriticalTie) {
    throw new Error('FALLO: Se esperaba detección de empate crítico en el corte.');
  }

  // 12. RESOLVER DESEMPATE MANUAL: El admin elige que avanza Sofía (02) y no Camila (03)
  console.log('⚖️ Resolviendo empate manual: Administrador selecciona a Sofía Martínez (02)...');
  await db
    .insert(roundResults)
    .values({
      roundId: round1.id,
      participantId: p2.id,
      roundScore: '77.7778',
      cumulativeScore: '77.7778',
      rank: 2,
      tieFlag: true,
      advanced: true,
      manualAdvance: true,
      decidedBy: judgeUsers[0].id,
      decidedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [roundResults.roundId, roundResults.participantId],
      set: { advanced: true, manualAdvance: true },
    });

  await db
    .insert(roundResults)
    .values({
      roundId: round1.id,
      participantId: p3.id,
      roundScore: '77.7778',
      cumulativeScore: '77.7778',
      rank: 2,
      tieFlag: true,
      advanced: false,
      manualAdvance: false,
      decidedBy: judgeUsers[0].id,
      decidedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [roundResults.roundId, roundResults.participantId],
      set: { advanced: false, manualAdvance: false },
    });

  // 13. CERRAR RONDA 1
  const closedRound1 = await closeRound(round1.id, judgeUsers[0].id);
  console.log('✓ Ronda 1 cerrada con éxito');
  console.log(`   - ¿Cerrada con jueces faltantes?: ${closedRound1.round.closedWithMissingJudges}`);

  // Verificar que en la Ronda 2 solo estén Valeria (01) y Sofía (02)
  const round2Parts = await db.select().from(roundParticipants).where(eq(roundParticipants.roundId, round2.id));
  const advancingIds = round2Parts.map((rp) => rp.participantId);
  console.log(`✓ Participantes que avanzaron a Ronda 2 (${advancingIds.length}):`);
  for (const id of advancingIds) {
    const [p] = await db.select().from(participants).where(eq(participants.id, id));
    console.log(`   * ${p.code}: ${p.name}`);
  }

  if (advancingIds.length !== 2 || !advancingIds.includes(p1.id) || !advancingIds.includes(p2.id)) {
    throw new Error('FALLO: El avance automático a la siguiente ronda no contiene exactamente a las 2 clasificadas.');
  }

  // 14. EJECUTAR RONDA 2 (Final)
  await db.update(rounds).set({ status: 'open' }).where(eq(rounds.id, round2.id));
  for (const j of [judgeUsers[0], judgeUsers[1]]) {
    // Valeria (01): 10 en todo
    for (const c of [crit1, crit2, crit3]) {
      await db.insert(scores).values({ roundId: round2.id, judgeId: j.id, participantId: p1.id, criterionId: c.id, value: '10.00' });
      await db.insert(scores).values({ roundId: round2.id, judgeId: j.id, participantId: p2.id, criterionId: c.id, value: '9.00' });
    }
    await db.insert(judgeRoundSubmissions).values({ roundId: round2.id, judgeId: j.id, submittedAt: new Date() });
  }

  // Cerrar Ronda 2
  await closeRound(round2.id, judgeUsers[0].id);
  console.log('✓ Ronda 2 (Final) calificada y cerrada');

  // 15. Cargar métrica de Miss Redes Sociales
  // Camila Torres (03) gana Miss Redes con 15,000 likes
  await db.insert(awardMetrics).values([
    { awardId: awardSocial.id, participantId: p1.id, value: '5000' },
    { awardId: awardSocial.id, participantId: p2.id, value: '8000' },
    { awardId: awardSocial.id, participantId: p3.id, value: '15000' },
    { awardId: awardSocial.id, participantId: p4.id, value: '3000' },
  ]);
  console.log('✓ Métricas de Miss Redes Sociales cargadas en award_metrics');

  // Calcular premios especiales
  const calculatedAwards = await calculateSpecialAwards(edition.id);
  console.log('✓ Premios especiales calculados:');
  for (const ca of calculatedAwards) {
    console.log(`   - ${ca.award.name}: Ganadora ${ca.winners.map(w => `${w.name} (${w.code})`).join(', ')}`);
  }

  // 16. Finalizar Certamen y publicar resultados
  await db.update(editions).set({ status: 'finished', resultsPublic: true, finishedAt: new Date() }).where(eq(editions.id, edition.id));
  console.log('✓ Edición marcada como finalizada y resultados hechos públicos');

  // 17. Verificar que la ganadora principal del certamen sea Valeria Gómez (01)
  const [winnerParticipant] = await db.select().from(participants).where(and(eq(participants.editionId, edition.id), eq(participants.status, 'winner')));
  console.log(`👑 GANADORA OFICIAL DEL CERTAMEN: ${winnerParticipant.name} (Código: ${winnerParticipant.code})`);

  if (winnerParticipant.id !== p1.id) {
    throw new Error('FALLO: La ganadora no coincide con la esperada.');
  }

  console.log('🎉 ¡SIMULACIÓN END-TO-END COMPLETADA CON ÉXITO ABSOLUTO!');
  process.exit(0);
}

runEndToEndSimulation().catch((err) => {
  console.error('❌ Error en simulación:', err);
  process.exit(1);
});
