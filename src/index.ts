import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { auth } from './modules/auth';
import { form } from './modules/form';
import { submission } from './modules/submission';

const app = new Elysia()
  .use(cors({ origin: 'http://localhost:3000' }))
  .use(auth)
  .use(form)
  .use(submission)
  .get('/', () => ({ status: 'ok', name: 'material-forms-api' }))
  .listen(5000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
