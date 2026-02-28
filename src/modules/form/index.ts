import { Elysia, t } from 'elysia';
import { formModel } from './model';
import { FormService } from './service';
import { authGuard } from '../../plugins/auth';

export const form = new Elysia({
  prefix: '/forms',
  name: 'Module.Form',
  tags: ['Forms'],
  detail: { security: [{ bearerAuth: [] }] },
})
  .use(formModel)
  .use(authGuard)
  .post(
    '/',
    async ({ body, userId }) => FormService.create(userId, body),
    {
      body: 'form.create',
      response: { 200: 'form.item' },
      detail: {
        summary: 'Create a form',
        description: 'Creates a new blank form for the authenticated user.',
      },
    }
  )
  .get('/', async ({ userId }) => FormService.listByUser(userId), {
    response: { 200: 'form.list' },
    detail: {
      summary: 'List my forms',
      description: 'Returns all forms owned by the authenticated user, ordered by last updated.',
    },
  })
  .get(
    '/:id',
    async ({ params: { id } }) => FormService.getById(id),
    {
      params: t.Object({ id: t.String() }),
      response: { 200: 'form.item', 404: 'form.error' },
      detail: {
        summary: 'Get a form',
        description: 'Returns a single form by ID with its response count.',
      },
    }
  )
  .patch(
    '/:id',
    async ({ params: { id }, body, userId }) => FormService.update(id, userId, body),
    {
      params: t.Object({ id: t.String() }),
      body: 'form.update',
      response: { 200: 'form.item', 403: 'form.error', 404: 'form.error' },
      detail: {
        summary: 'Update a form',
        description: 'Updates title, description, theme color, or questions of an owned form.',
      },
    }
  )
  .delete(
    '/:id',
    async ({ params: { id }, userId }) => FormService.delete(id, userId),
    {
      params: t.Object({ id: t.String() }),
      response: { 200: 'form.success', 403: 'form.error', 404: 'form.error' },
      detail: {
        summary: 'Delete a form',
        description: 'Permanently deletes a form and all its submissions.',
      },
    }
  )
  .post(
    '/:id/publish',
    async ({ params: { id }, userId }) => FormService.setStatus(id, userId, 'PUBLISHED'),
    {
      params: t.Object({ id: t.String() }),
      response: { 200: 'form.item', 403: 'form.error', 404: 'form.error' },
      detail: {
        summary: 'Publish a form',
        description: 'Sets the form status to PUBLISHED, making it publicly accessible for submissions.',
      },
    }
  )
  .post(
    '/:id/close',
    async ({ params: { id }, userId }) => FormService.setStatus(id, userId, 'CLOSED'),
    {
      params: t.Object({ id: t.String() }),
      response: { 200: 'form.item', 403: 'form.error', 404: 'form.error' },
      detail: {
        summary: 'Close a form',
        description: 'Sets the form status to CLOSED, preventing new submissions.',
      },
    }
  );
