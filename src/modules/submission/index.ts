import { Elysia, t } from 'elysia';
import { submissionModel } from './model';
import { SubmissionService } from './service';
import { authGuard } from '../../plugins/auth';
import { prisma } from '../../db';

export const submission = new Elysia({ name: 'Module.Submission' })
  .use(submissionModel)
  // ─── Public routes (no auth) ───
  .get(
    '/public/forms/:id',
    async ({ params: { id }, status }) => {
      const form = await SubmissionService.getPublicForm(id);
      if (!form) return status(404, { error: 'Form not found or not published' });
      return form;
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/public/forms/:id/submit',
    async ({ params: { id }, body, status }) => {
      const result = await SubmissionService.submit(id, body.answers);
      if ('error' in result) {
        if (result.error === 'not_found') return status(404, { error: 'Form not found or not accepting responses' });
        if (result.error === 'validation') return status(422, { error: 'Missing required answers', fields: result.fields });
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: 'submission.create',
    }
  )
  // ─── Protected routes (auth required) ───
  .use(authGuard)
  .get(
    '/forms/:id/stats',
    async ({ params: { id }, userId, status }) => {
      const form = await prisma.form.findUnique({ where: { id } });
      if (!form) return status(404, { error: 'Form not found' });
      if (form.userId !== userId) return status(403, { error: 'Not authorized' });

      const stats = await SubmissionService.getStats(id);
      if (!stats) return status(404, { error: 'Form not found' });
      return stats;
    },
    { params: t.Object({ id: t.String() }) }
  );
