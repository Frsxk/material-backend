import { status } from 'elysia';
import { prisma } from '../../db';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export type SafeUser = { id: string; name: string | null; email: string };

export class AuthService {
  static async register({ name, email, password }: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return status(409, { error: 'Email already registered' });

    const passwordHash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });

    return prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  }

  static async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return status(401, { error: 'Invalid email or password' });

    const valid = await Bun.password.verify(password, user.passwordHash);
    if (!valid) return status(401, { error: 'Invalid email or password' });

    return { id: user.id, name: user.name, email: user.email };
  }

  static async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    if (!user) return status(404, { error: 'User not found' });
    return user;
  }
}
