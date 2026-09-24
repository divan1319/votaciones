import { pgTable, text, timestamp, boolean, integer, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- BETTER AUTH TABLES ---

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('judge'), // 'admin' | 'judge'
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- CORE CONTEST TABLES ---

export const contests = pgTable('contests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const editions = pgTable('editions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  contestId: text('contest_id').notNull().references(() => contests.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Ej: "2026", "Primavera 2026"
  status: text('status', { enum: ['draft', 'active', 'finished'] }).notNull().default('draft'),
  criteriaScope: text('criteria_scope', { enum: ['edition', 'round'] }).notNull().default('edition'),
  judgesScope: text('judges_scope', { enum: ['edition', 'round'] }).notNull().default('edition'),
  scoringMethod: text('scoring_method', { enum: ['average', 'sum'] }).notNull().default('average'),
  accumulateRounds: boolean('accumulate_rounds').notNull().default(false),
  scaleMin: numeric('scale_min', { precision: 10, scale: 2 }).notNull().default('1.00'),
  scaleMax: numeric('scale_max', { precision: 10, scale: 2 }).notNull().default('10.00'),
  resultsPublic: boolean('results_public').notNull().default(false),
  finishedAt: timestamp('finished_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rounds = pgTable('rounds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Ej: "Traje Típico", "Semifinal", "Final"
  position: integer('position').notNull(), // 1, 2, 3...
  advanceMode: text('advance_mode', { enum: ['top_n', 'min_score'] }).notNull().default('top_n'),
  advanceValue: numeric('advance_value', { precision: 10, scale: 2 }).notNull().default('5.00'),
  status: text('status', { enum: ['pending', 'open', 'closed'] }).notNull().default('pending'),
  closedAt: timestamp('closed_at'),
  closedWithMissingJudges: boolean('closed_with_missing_judges').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const participants = pgTable('participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(), // Ej: "01", "C-12"
  status: text('status', { enum: ['active', 'eliminated', 'winner'] }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('edition_participant_code_idx').on(table.editionId, table.code),
]);

export const roundParticipants = pgTable('round_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('round_participant_idx').on(table.roundId, table.participantId),
]);

export const editionJudges = pgTable('edition_judges', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('edition_judge_idx').on(table.editionId, table.userId),
]);

export const roundJudges = pgTable('round_judges', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('round_judge_idx').on(table.roundId, table.userId),
]);

export const criteria = pgTable('criteria', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  roundId: text('round_id').references(() => rounds.id, { onDelete: 'cascade' }), // Nullable: null = criterio general
  name: text('name').notNull(),
  weight: numeric('weight', { precision: 5, scale: 2 }).notNull(), // Porcentaje: 0.00 a 100.00
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const scores = pgTable('scores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  judgeId: text('judge_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  criterionId: text('criterion_id').notNull().references(() => criteria.id, { onDelete: 'cascade' }),
  value: numeric('value', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('score_unique_idx').on(table.roundId, table.judgeId, table.participantId, table.criterionId),
  index('score_round_participant_idx').on(table.roundId, table.participantId),
]);

export const judgeRoundSubmissions = pgTable('judge_round_submissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  judgeId: text('judge_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('judge_round_submission_idx').on(table.roundId, table.judgeId),
]);

export const roundResults = pgTable('round_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roundId: text('round_id').notNull().references(() => rounds.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  roundScore: numeric('round_score', { precision: 12, scale: 4 }).notNull(),
  cumulativeScore: numeric('cumulative_score', { precision: 12, scale: 4 }).notNull(),
  rank: integer('rank').notNull(),
  tieFlag: boolean('tie_flag').notNull().default(false),
  advanced: boolean('advanced').notNull().default(false),
  manualAdvance: boolean('manual_advance'), // Nullable: true/false si fue decidido manualmente por admin
  decidedBy: text('decided_by').references(() => user.id, { onDelete: 'set null' }),
  decidedAt: timestamp('decided_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('round_result_participant_idx').on(table.roundId, table.participantId),
]);

// --- SPECIAL AWARDS TABLES ---

export const awards = pgTable('awards', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  editionId: text('edition_id').notNull().references(() => editions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Ej: "Miss Fotogénica", "Mejor Sonrisa"
  type: text('type', { enum: ['criterion', 'metric', 'manual'] }).notNull(),
  metricLabel: text('metric_label'), // Ej: "Votos en redes sociales"
  winnersCount: integer('winners_count').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const awardCriteria = pgTable('award_criteria', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  awardId: text('award_id').notNull().references(() => awards.id, { onDelete: 'cascade' }),
  criterionId: text('criterion_id').notNull().references(() => criteria.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('award_criterion_idx').on(table.awardId, table.criterionId),
]);

export const awardMetrics = pgTable('award_metrics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  awardId: text('award_id').notNull().references(() => awards.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  value: numeric('value', { precision: 12, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('award_metric_participant_idx').on(table.awardId, table.participantId),
]);

export const awardWinners = pgTable('award_winners', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  awardId: text('award_id').notNull().references(() => awards.id, { onDelete: 'cascade' }),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  decidedBy: text('decided_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('award_winner_idx').on(table.awardId, table.participantId),
]);

// --- RELATIONS ---

export const contestsRelations = relations(contests, ({ many }) => ({
  editions: many(editions),
}));

export const editionsRelations = relations(editions, ({ one, many }) => ({
  contest: one(contests, {
    fields: [editions.contestId],
    references: [contests.id],
  }),
  rounds: many(rounds),
  participants: many(participants),
  criteria: many(criteria),
  awards: many(awards),
  judges: many(editionJudges),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  edition: one(editions, {
    fields: [rounds.editionId],
    references: [editions.id],
  }),
  roundParticipants: many(roundParticipants),
  roundJudges: many(roundJudges),
  criteria: many(criteria),
  scores: many(scores),
  submissions: many(judgeRoundSubmissions),
  results: many(roundResults),
}));

export const participantsRelations = relations(participants, ({ one, many }) => ({
  edition: one(editions, {
    fields: [participants.editionId],
    references: [editions.id],
  }),
  roundParticipants: many(roundParticipants),
  scores: many(scores),
  results: many(roundResults),
  awardMetrics: many(awardMetrics),
  awardWinners: many(awardWinners),
}));
