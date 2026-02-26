import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export const jwtPlugin = new Elysia({ name: 'Plugin.JWT' }).use(
  jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET!,
    exp: '7d',
  })
);

/**
 * Auth guard — derives `userId` from the Bearer token.
 * Use with `.use(authGuard)` on any route group that requires authentication.
 */
export const authGuard = new Elysia({ name: 'Plugin.AuthGuard' })
  .use(jwtPlugin)
  .derive({ as: 'scoped' }, async ({ jwt, headers, status }) => {
    const authHeader = headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return status(401, { error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sub !== 'string') {
      return status(401, { error: 'Invalid or expired token' });
    }

    return { userId: payload.sub };
  });
