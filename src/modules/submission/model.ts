import { Elysia, t } from 'elysia';

export const submissionModel = new Elysia({ name: 'Model.Submission' }).model({
  'submission.create': t.Object({
    answers: t.Record(
      t.String(),
      t.Union([t.String(), t.Array(t.String())])
    ),
  }),
});
