import { Elysia, t } from 'elysia';
import { formModel } from './model';
import { FormService } from './service';
import { authGuard } from '../../plugins/auth';

export const form = new Elysia({ prefix: '/forms', name: 'Module.Form' })
  .use(formModel)
  .use(authGuard)
  .post(
    '/',
    async ({ body, userId }) => {
      return FormService.create(userId, body);
    },
    { body: 'form.create' }
  )
  .get('/', async ({ userId }) => {
    return FormService.listByUser(userId);
  })
  .get(
    '/:id',
    async ({ params: { id }, userId, status }) => {
      const form = await FormService.getById(id);
      if (!form) return status(404, { error: 'Form not found' });
      return form;
    },
    { params: t.Object({ id: t.String() }) }
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, userId, status }) => {
      const result = await FormService.update(id, userId, body);
      if ('error' in result) {
        if (result.error === 'not_found') return status(404, { error: 'Form not found' });
        return status(403, { error: 'Not authorized' });
      }
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: 'form.update',
    }
  )
  .delete(
    '/:id',
    async ({ params: { id }, userId, status }) => {
      const result = await FormService.delete(id, userId);
      if ('error' in result) {
        if (result.error === 'not_found') return status(404, { error: 'Form not found' });
        return status(403, { error: 'Not authorized' });
      }
      return result;
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/:id/publish',
    async ({ params: { id }, userId, status }) => {
      const result = await FormService.setStatus(id, userId, 'PUBLISHED');
      if ('error' in result) {
        if (result.error === 'not_found') return status(404, { error: 'Form not found' });
        return status(403, { error: 'Not authorized' });
      }
      return result;
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/:id/close',
    async ({ params: { id }, userId, status }) => {
      const result = await FormService.setStatus(id, userId, 'CLOSED');
      if ('error' in result) {
        if (result.error === 'not_found') return status(404, { error: 'Form not found' });
        return status(403, { error: 'Not authorized' });
      }
      return result;
    },
    { params: t.Object({ id: t.String() }) }
  );
