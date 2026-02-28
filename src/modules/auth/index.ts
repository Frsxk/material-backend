import { Elysia } from 'elysia';
import { authModel } from './model';
import { AuthService, type SafeUser } from './service';
import { jwtPlugin, authGuard } from '../../plugins/auth';

export const auth = new Elysia({ prefix: '/auth', name: 'Module.Auth', tags: ['Auth'] })
  .use(authModel)
  .use(jwtPlugin)
  .post(
    '/register',
    async ({ body, jwt }) => {
      const result = await AuthService.register(body);
      if ('error' in result) return result;

      const user = result as SafeUser;
      const token = await jwt.sign({ sub: user.id });
      return { token, user: { id: user.id, name: user.name, email: user.email } };
    },
    {
      body: 'auth.register',
      response: { 200: 'auth.tokens', 409: 'auth.error' },
      detail: {
        summary: 'Register a new user',
        description: 'Creates a new account and returns a JWT token.',
      },
    }
  )
  .post(
    '/login',
    async ({ body, jwt }) => {
      const result = await AuthService.login(body);
      if ('error' in result) return result;

      const user = result as SafeUser;
      const token = await jwt.sign({ sub: user.id });
      return { token, user: { id: user.id, name: user.name, email: user.email } };
    },
    {
      body: 'auth.login',
      response: { 200: 'auth.tokens', 401: 'auth.error' },
      detail: {
        summary: 'Log in',
        description: 'Authenticates with email and password, returns a JWT token.',
      },
    }
  )
  .use(authGuard)
  .get('/me', async ({ userId }) => AuthService.getById(userId), {
    response: { 200: 'auth.user', 404: 'auth.error' },
    detail: {
      summary: 'Get current user',
      description: 'Returns the profile of the authenticated user.',
      security: [{ bearerAuth: [] }],
    },
  });
