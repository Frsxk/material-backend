import { Elysia, t } from 'elysia';

export const authModel = new Elysia({ name: 'Model.Auth' }).model({
  'auth.register': t.Object({
    name: t.String({ minLength: 1 }),
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 8 }),
  }),
  'auth.login': t.Object({
    email: t.String({ format: 'email' }),
    password: t.String({ minLength: 1 }),
  }),
  'auth.tokens': t.Object({
    token: t.String(),
    user: t.Object({
      id: t.String(),
      name: t.Nullable(t.String()),
      email: t.String(),
    }),
  }),
});
