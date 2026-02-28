import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { fromTypes, openapi } from '@elysiajs/openapi';
import { auth } from './modules/auth';
import { form } from './modules/form';
import { submission } from './modules/submission';

export const app = new Elysia()
  .use(cors({ origin: 'https://material-forms.netlify.app' }))
  .use(
    openapi({
      references: fromTypes(),
      documentation: {
        info: {
          title: 'Material Forms API',
          version: '1.0.0',
          description: 'Backend API for Material Forms application, built with Elysia. Provides authentication, form management, and submission handling.',
        },
        tags: [
          { name: 'Auth', description: 'Registration, login, and session management' },
          { name: 'Forms', description: 'CRUD operations for forms' },
          { name: 'Submissions', description: 'Public form access, response submission, stats, and CSV export' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT token obtained from /auth/register or /auth/login',
            },
          },
        },
      },
    })
  )
  .use(auth)
  .use(form)
  .use(submission)
  .get('/', () => ({ status: 'ok', name: 'material-forms-api' }), {
    detail: { tags: ['App'], summary: 'Health check', description: 'Returns API status.' },
  });

if (import.meta.main) {
  app.listen(5000);
  console.log(
    `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
  );
}
