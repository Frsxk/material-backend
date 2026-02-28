import { Elysia, t } from 'elysia';

const error = t.Object({ error: t.String() });

export const submissionModel = new Elysia({ name: 'Model.Submission' }).model({
  'submission.create': t.Object({
    answers: t.Record(
      t.String(),
      t.Union([t.String(), t.Array(t.String())])
    ),
  }, { description: 'Submission payload — map of question ID to answer value(s)' }),
  'submission.publicForm': t.Object({
    id: t.String(),
    title: t.String(),
    description: t.Nullable(t.String()),
    themeColor: t.String(),
    questions: t.Unknown(),
  }, { description: 'Public-facing form for respondents' }),
  'submission.result': t.Object({
    id: t.String(),
    submittedAt: t.String(),
  }, { description: 'Successful submission result' }),
  'submission.validationError': t.Object({
    error: t.String(),
    fields: t.Array(t.Object({
      id: t.String(),
      title: t.String(),
    })),
  }, { description: 'Validation error — lists required questions that were not answered' }),
  'submission.stats': t.Object({
    formId: t.String(),
    totalResponses: t.Number(),
    completionRate: t.Number(),
    averageTimeSeconds: t.Number(),
    questionStats: t.Array(
      t.Object({
        questionId: t.String(),
        questionTitle: t.String(),
        questionType: t.String(),
        totalAnswers: t.Number(),
        distribution: t.Optional(t.Record(t.String(), t.Number())),
        averageValue: t.Optional(t.Number()),
      })
    ),
    responsesOverTime: t.Array(
      t.Object({
        date: t.String(),
        count: t.Number(),
      })
    ),
  }, { description: 'Aggregated form analytics — response count, completion rate, per-question distribution, and responses over time' }),
  'submission.rateLimited': t.Object({
    error: t.String(),
    retryAfterSeconds: t.Number(),
  }, { description: 'Rate limit exceeded — includes seconds until retry is allowed' }),
  'submission.error': error,
});
