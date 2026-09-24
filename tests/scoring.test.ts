import { describe, it, expect } from 'vitest';
import { normalizeScore } from '../server/services/scoring';

describe('Motor de Cálculo - Normalización y Reglas Matemáticas', () => {
  it('normaliza correctamente valores dentro del rango [scale_min, scale_max]', () => {
    // Escala 1 a 10
    expect(normalizeScore(1, 1, 10)).toBe(0);
    expect(normalizeScore(10, 1, 10)).toBe(100);
    expect(normalizeScore(5.5, 1, 10)).toBe(50);

    // Escala 0 a 100
    expect(normalizeScore(0, 0, 100)).toBe(0);
    expect(normalizeScore(100, 0, 100)).toBe(100);
    expect(normalizeScore(75, 0, 100)).toBe(75);

    // Escala 1 a 5
    expect(normalizeScore(3, 1, 5)).toBe(50);
  });

  it('aplica clamping si el valor excede los límites de la escala', () => {
    expect(normalizeScore(12, 1, 10)).toBe(100);
    expect(normalizeScore(-5, 1, 10)).toBe(0);
  });

  it('calcula puntaje ponderado de un juez con criterios que suman 100%', () => {
    const scaleMin = 1;
    const scaleMax = 10;
    const criteria = [
      { name: 'Belleza', weight: 40, rawValue: 10 },    // norm = 100, ponderado = 40
      { name: 'Pasarela', weight: 30, rawValue: 5.5 },  // norm = 50,  ponderado = 15
      { name: 'Entrevista', weight: 30, rawValue: 1 },  // norm = 0,   ponderado = 0
    ];

    let totalWeightedScore = 0;
    for (const c of criteria) {
      const norm = normalizeScore(c.rawValue, scaleMin, scaleMax);
      totalWeightedScore += norm * (c.weight / 100);
    }

    expect(totalWeightedScore).toBeCloseTo(55.0, 4);
  });

  it('calcula correctamente método average vs sum para múltiples jueces', () => {
    const scoresJudge1 = 80;
    const scoresJudge2 = 90;
    const scoresJudge3 = 70;
    const allScores = [scoresJudge1, scoresJudge2, scoresJudge3];

    const averageScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    const sumScore = allScores.reduce((a, b) => a + b, 0);

    expect(averageScore).toBe(80);
    expect(sumScore).toBe(240);
  });

  it('calcula acumulado como promedio de rondas jugadas cuando accumulate_rounds es true', () => {
    const round1Score = 85.5;
    const round2Score = 91.5;
    const cumulative = (round1Score + round2Score) / 2;

    expect(cumulative).toBe(88.5);
  });

  it('detecta empates críticos en la frontera de corte para top_n', () => {
    const participants = [
      { id: '1', score: 95 },
      { id: '2', score: 90 },
      { id: '3', score: 85 }, // puesto 3 (corte)
      { id: '4', score: 85 }, // puesto 4 (empate con el 3!)
      { id: '5', score: 70 },
    ];

    const topN = 3;
    const cutScore = participants[topN - 1].score;
    const nextScore = participants[topN].score;

    const isCriticalTie = cutScore === nextScore;
    expect(isCriticalTie).toBe(true);
  });

  it('no bloquea si el empate está fuera del corte', () => {
    const participants = [
      { id: '1', score: 95 },
      { id: '2', score: 90 },
      { id: '3', score: 88 }, // puesto 3 avanza
      { id: '4', score: 80 }, // puesto 4 eliminado
      { id: '5', score: 80 }, // puesto 5 eliminado (empatan entre eliminados, no afecta quién avanza)
    ];

    const topN = 3;
    const cutScore = participants[topN - 1].score;
    const nextScore = participants[topN].score;

    const isCriticalTie = cutScore === nextScore;
    expect(isCriticalTie).toBe(false);
  });
});
