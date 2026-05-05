/// Standard PAR-Q questions adapted to pt-BR. Keys are stable across
/// versions so the latest-answers pre-fill keeps working when copy is
/// tweaked. Bumping `PARQ_VERSION` (in api/health-gate.ts) is the proper
/// way to force a re-answer when the question SET itself changes.
export interface ParqQuestion {
  key: string;
  label: string;
  /// Which answer flips the "consult a doctor" warning. Most PAR-Q questions
  /// are phrased so a `sim` flag means caution.
  risk: 'sim' | 'nao';
}

export const PARQ_QUESTIONS: ReadonlyArray<ParqQuestion> = [
  {
    key: 'cardiac',
    label:
      'Algum médico já te disse que você tem problema de coração e que só deveria fazer atividade física com supervisão?',
    risk: 'sim',
  },
  {
    key: 'chestPainExercise',
    label: 'Você sente dor no peito quando faz atividade física?',
    risk: 'sim',
  },
  {
    key: 'chestPainRest',
    label:
      'No último mês, você teve dor no peito sem estar fazendo atividade física?',
    risk: 'sim',
  },
  {
    key: 'dizziness',
    label:
      'Você tem perda de equilíbrio por tontura ou já perdeu a consciência fazendo atividade física?',
    risk: 'sim',
  },
  {
    key: 'jointBone',
    label:
      'Você tem algum problema ósseo ou articular que pode piorar com atividade física?',
    risk: 'sim',
  },
  {
    key: 'medication',
    label:
      'Você toma remédio para pressão alta ou problema de coração?',
    risk: 'sim',
  },
  {
    key: 'otherReason',
    label:
      'Existe alguma outra razão pela qual você não deveria fazer atividade física?',
    risk: 'sim',
  },
] as const;
