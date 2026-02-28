import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const jwtPlugin = new Elysia({ name: 'Plugin.JWT' }).use(
  jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
    exp: '7d',
    schema: t.Object({
      sub: t.String(),
    }),
  })
);

/**
 * Auth guard — derives `userId` from the Bearer token.
 * Uses derive to extract credentials and onBeforeHandle to gate requests.
 */
export const authGuard = new Elysia({ name: 'Plugin.AuthGuard' })
  .use(jwtPlugin)
  .derive({ as: 'scoped' }, async ({ jwt, headers }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return { userId: '' };

    const token = authHeader.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sub !== 'string') return { userId: '' };

    return { userId: payload.sub };
  })
  .onBeforeHandle({ as: 'scoped' }, ({ userId, status }) => {
    if (!userId) {
      return status(401, { error: 'Missing or invalid authorization header' });
    }
  });
