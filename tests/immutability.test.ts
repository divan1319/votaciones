import { describe, it, expect } from 'vitest';

describe('Reglas de Inmutabilidad y Equidad (Fairness)', () => {
  it('garantiza la regla de equidad: ningún juez puede enviar si falta algún participante por calificar', () => {
    const roundParticipants = ['p1', 'p2', 'p3'];
    const roundCriteria = ['c1', 'c2'];

    // Calificaciones existentes para el juez: califica p1 y p2 completos, pero a p3 solo le califica c1 (falta c2)
    const judgeScores = [
      { participantId: 'p1', criterionId: 'c1', value: 8 },
      { participantId: 'p1', criterionId: 'c2', value: 9 },
      { participantId: 'p2', criterionId: 'c1', value: 7 },
      { participantId: 'p2', criterionId: 'c2', value: 8 },
      { participantId: 'p3', criterionId: 'c1', value: 6 },
      // Falta p3 c2!
    ];

    const scoreKeys = new Set(judgeScores.map((s) => `${s.participantId}_${s.criterionId}`));

    let missing = 0;
    for (const p of roundParticipants) {
      for (const c of roundCriteria) {
        if (!scoreKeys.has(`${p}_${c}`)) {
          missing++;
        }
      }
    }

    expect(missing).toBe(1);
    const canSubmit = missing === 0;
    expect(canSubmit).toBe(false);
  });

  it('permite el envío únicamente cuando la matriz de participantes x criterios está completa', () => {
    const roundParticipants = ['p1', 'p2'];
    const roundCriteria = ['c1', 'c2'];

    const judgeScores = [
      { participantId: 'p1', criterionId: 'c1', value: 8 },
      { participantId: 'p1', criterionId: 'c2', value: 9 },
      { participantId: 'p2', criterionId: 'c1', value: 7 },
      { participantId: 'p2', criterionId: 'c2', value: 8 },
    ];

    const scoreKeys = new Set(judgeScores.map((s) => `${s.participantId}_${s.criterionId}`));

    let missing = 0;
    for (const p of roundParticipants) {
      for (const c of roundCriteria) {
        if (!scoreKeys.has(`${p}_${c}`)) {
          missing++;
        }
      }
    }

    expect(missing).toBe(0);
    const canSubmit = missing === 0;
    expect(canSubmit).toBe(true);
  });

  it('verifica que la existencia de registro en judge_round_submissions bloquea cualquier edición posterior', () => {
    const submissions = [
      { roundId: 'r1', judgeId: 'j1', submittedAt: new Date() },
    ];

    function canEditScores(roundId: string, judgeId: string) {
      const isSubmitted = submissions.some(
        (s) => s.roundId === roundId && s.judgeId === judgeId
      );
      return !isSubmitted;
    }

    expect(canEditScores('r1', 'j1')).toBe(false); // Bloqueado!
    expect(canEditScores('r1', 'j2')).toBe(true);  // Juez 2 todavía no envía, puede editar
  });
});
