import { Elysia } from 'elysia';
import { authModel } from './model';
import { AuthService } from './service';
import { jwtPlugin, authGuard } from '../../plugins/auth';

export const auth = new Elysia({ prefix: '/auth', name: 'Module.Auth' })
  .use(authModel)
  .use(jwtPlugin)
  .post(
    '/register',
    async ({ body, jwt, status }) => {
      const user = await AuthService.register(body);
      if (!user) return status(409, { error: 'Email already registered' });

      const token = await jwt.sign({ sub: user.id });
      return { token, user };
    },
    { body: 'auth.register' }
  )
  .post(
    '/login',
    async ({ body, jwt, status }) => {
      const user = await AuthService.login(body);
      if (!user) return status(401, { error: 'Invalid email or password' });

      const token = await jwt.sign({ sub: user.id });
      return { token, user };
    },
    { body: 'auth.login' }
  )
  .use(authGuard)
  .get('/me', async ({ userId, status }) => {
    const user = await AuthService.getById(userId);
    if (!user) return status(404, { error: 'User not found' });
    return user;
  });
