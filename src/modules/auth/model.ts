import { Elysia, t } from 'elysia';

const user = t.Object({
  id: t.String(),
  name: t.Nullable(t.String()),
  email: t.String(),
});

const error = t.Object({ error: t.String() });

export const authModel = new Elysia({ name: 'Model.Auth' }).model({
  'auth.register': t.Object({
    name: t.String({ minLength: 1 }),
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
  }, { description: 'Registration credentials' }),
  'auth.login': t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 1 }),
  }, { description: 'Login credentials' }),
  'auth.tokens': t.Object({
    token: t.String(),
    user,
  }, { description: 'Authentication result with JWT and user profile' }),
  'auth.user': user,
  'auth.error': error,
});
