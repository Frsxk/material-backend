import { status } from 'elysia';
import { prisma } from '../../db';

interface FormCreateInput {
  title?: string;
  description?: string;
  themeColor?: string;
}

interface FormUpdateInput {
  title?: string;
  description?: string | null;
  themeColor?: string;
  questions?: unknown;
}

interface FormWithCount {
  id: string;
  title: string;
  description: string | null;
  status: string;
  themeColor: string;
  questions: unknown;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PrismaFormWithCount {
  id: string;
  title: string;
  description: string | null;
  status: string;
  themeColor: string;
  questions: unknown;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  _count: { submissions: number };
}

export class FormService {
  static async create(userId: string, data?: FormCreateInput): Promise<FormWithCount> {
    const form = await prisma.form.create({
      data: {
        userId,
        title: data?.title ?? 'Untitled Form',
        description: data?.description,
        themeColor: data?.themeColor ?? '#6750A4',
      },
      include: { _count: { select: { submissions: true } } },
    });

    return FormService.toResponse(form);
  }

  static async listByUser(userId: string): Promise<FormWithCount[]> {
    const forms = await prisma.form.findMany({
      where: { userId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return forms.map(FormService.toResponse);
  }

  static async getById(id: string) {
    const form = await prisma.form.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });

    if (!form) return status(404, { error: 'Form not found' });
    return FormService.toResponse(form);
  }

  static async update(id: string, userId: string, data: FormUpdateInput) {
    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return status(404, { error: 'Form not found' });
    if (form.userId !== userId) return status(403, { error: 'Not authorized' });

    const updated = await prisma.form.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        themeColor: data.themeColor,
        questions: data.questions ?? undefined,
      },
      include: { _count: { select: { submissions: true } } },
    });

    return FormService.toResponse(updated);
  }

  static async delete(id: string, userId: string) {
    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return status(404, { error: 'Form not found' });
    if (form.userId !== userId) return status(403, { error: 'Not authorized' });

    await prisma.form.delete({ where: { id } });
    return { success: true };
  }

  static async setStatus(id: string, userId: string, newStatus: 'PUBLISHED' | 'CLOSED') {
    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return status(404, { error: 'Form not found' });
    if (form.userId !== userId) return status(403, { error: 'Not authorized' });

    const updated = await prisma.form.update({
      where: { id },
      data: { status: newStatus },
      include: { _count: { select: { submissions: true } } },
    });

    return FormService.toResponse(updated);
  }

  private static toResponse(form: PrismaFormWithCount): FormWithCount {
    return {
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status.toLowerCase(),
      themeColor: form.themeColor,
      questions: form.questions,
      responseCount: form._count.submissions,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }
}
