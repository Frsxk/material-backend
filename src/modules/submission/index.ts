import { Elysia, t } from 'elysia';
import { submissionModel } from './model';
import { SubmissionService } from './service';
import { authGuard } from '../../plugins/auth';
import { rateLimit } from '../../plugins/rateLimit';

const submitRateLimit = rateLimit({
  windowMs: 30_000,
  key: ({ ip, params }) => (params.id ? `${ip}:${params.id}` : null),
});

export const submission = new Elysia({ name: 'Module.Submission', tags: ['Submissions'] })
  .use(submissionModel)
  // ─── Public routes (no auth) ───
  .get(
    '/public/forms/:id',
    async ({ params: { id } }) => SubmissionService.getPublicForm(id),
    {
      params: t.Object({ id: t.String() }),
      response: { 200: 'submission.publicForm', 404: 'submission.error' },
      detail: {
        summary: 'Get a published form',
        description: 'Returns form details for public respondents. Only works for PUBLISHED forms.',
      },
    }
  )
  .post(
    '/public/forms/:id/submit',
    async ({ params: { id }, body }) => SubmissionService.submit(id, body.answers),
    {
      params: t.Object({ id: t.String() }),
      body: 'submission.create',
      beforeHandle: submitRateLimit,
      response: {
        200: 'submission.result',
        404: 'submission.error',
        422: 'submission.validationError',
        429: 'submission.rateLimited',
      },
      detail: {
        summary: 'Submit a response',
        description: 'Submits answers to a published form. Rate limited to once per 30 seconds per IP per form.',
      },
    }
  )
  // ─── Protected routes (auth required) ───
  .use(authGuard)
  .get(
    '/forms/:id/stats',
    async ({ params: { id }, userId }) => SubmissionService.getStats(id, userId),
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: 'submission.stats',
        403: 'submission.error',
        404: 'submission.error',
      },
      detail: {
        summary: 'Get form statistics',
        description: 'Returns aggregated analytics for a form: response count, completion rate, per-question distribution, and responses over time.',
        security: [{ bearerAuth: [] }],
      },
    }
  )
  .get(
    '/forms/:id/export',
    async ({ params: { id }, userId }) => {
      const result = await SubmissionService.exportCsv(id, userId);
      if ('error' in result) return result;

      const { csv, title } = result as { csv: string; title: string };
      const filename = title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'export';
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        403: 'submission.error',
        404: 'submission.error',
      },
      detail: {
        summary: 'Export submissions as CSV',
        description: 'Downloads all submissions for a form as a CSV file with human-readable values.',
        security: [{ bearerAuth: [] }],
      },
    }
  );
