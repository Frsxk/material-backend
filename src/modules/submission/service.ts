import { prisma } from '../../db';

interface Question {
  id: string;
  type: string;
  title: string;
  required: boolean;
  options?: { id: string; label: string }[];
}

interface QuestionStat {
  questionId: string;
  questionTitle: string;
  questionType: string;
  totalAnswers: number;
  distribution?: Record<string, number>;
  averageValue?: number;
}

interface SubmissionRow {
  id: string;
  formId: string;
  answers: Record<string, string | string[]>;
  submittedAt: Date;
}

export class SubmissionService {
  /** Fetch a published form for public respondents (no auth needed) */
  static async getPublicForm(formId: string) {
    const form = await prisma.form.findUnique({ where: { id: formId } });

    if (!form || form.status !== 'PUBLISHED') return null;

    return {
      id: form.id,
      title: form.title,
      description: form.description,
      themeColor: form.themeColor,
      questions: form.questions,
    };
  }

  /** Submit a response to a published form */
  static async submit(formId: string, answers: Record<string, string | string[]>) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form || form.status !== 'PUBLISHED') {
      return { error: 'not_found' as const };
    }

    // Validate required questions are answered
    const questions = form.questions as unknown as Question[];
    const missingRequired = questions
      .filter((q) => q.required)
      .filter((q) => {
        const answer = answers[q.id];
        if (answer === undefined || answer === null) return true;
        if (Array.isArray(answer)) return answer.length === 0;
        return String(answer).trim() === '';
      });

    if (missingRequired.length > 0) {
      return {
        error: 'validation' as const,
        fields: missingRequired.map((q) => ({ id: q.id, title: q.title })),
      };
    }

    const submission = await prisma.submission.create({
      data: { formId, answers },
    });

    return { id: submission.id, submittedAt: submission.submittedAt.toISOString() };
  }

  /** Aggregate submissions into FormStats shape for the analytics page */
  static async getStats(formId: string) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return null;

    const rawSubmissions = await prisma.submission.findMany({
      where: { formId },
      orderBy: { submittedAt: 'asc' },
    });

    const submissions = rawSubmissions as unknown as SubmissionRow[];
    const questions = form.questions as unknown as Question[];
    const totalResponses = submissions.length;

    // Count how many submissions answered all required questions
    const requiredIds = questions.filter((q) => q.required).map((q) => q.id);
    const completeCount = submissions.filter((sub) => {
      return requiredIds.every((id) => {
        const val = sub.answers[id];
        if (val === undefined || val === null) return false;
        if (Array.isArray(val)) return val.length > 0;
        return String(val).trim() !== '';
      });
    }).length;

    const completionRate = totalResponses > 0
      ? Math.round((completeCount / totalResponses) * 1000) / 10
      : 0;

    // Per-question stats
    const questionStats: QuestionStat[] = questions.map((q) => {
      const answered = submissions.filter((sub) => {
        const val = sub.answers[q.id];
        return val !== undefined && val !== null && val !== '';
      });

      const stat: QuestionStat = {
        questionId: q.id,
        questionTitle: q.title,
        questionType: q.type,
        totalAnswers: answered.length,
      };

      // Distribution for single-choice types
      if (['multiple_choice', 'dropdown'].includes(q.type) && q.options) {
        const dist: Record<string, number> = {};
        for (const opt of q.options) dist[opt.label] = 0;
        for (const sub of answered) {
          const val = sub.answers[q.id] as string;
          const opt = q.options!.find((o) => o.id === val);
          if (opt) dist[opt.label]++;
        }
        stat.distribution = dist;
      }

      // Distribution for multi-choice (checkbox)
      if (q.type === 'checkbox' && q.options) {
        const dist: Record<string, number> = {};
        for (const opt of q.options) dist[opt.label] = 0;
        for (const sub of answered) {
          const vals = (sub.answers[q.id] ?? []) as string[];
          for (const val of vals) {
            const opt = q.options!.find((o) => o.id === val);
            if (opt) dist[opt.label]++;
          }
        }
        stat.distribution = dist;
      }

      // Average + distribution for numeric types
      if (['scale', 'rating'].includes(q.type)) {
        const values: number[] = answered
          .map((sub) => parseInt(sub.answers[q.id] as string))
          .filter((n: number) => !isNaN(n));

        if (values.length > 0) {
          stat.averageValue = Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 10) / 10;

          const dist: Record<string, number> = {};
          for (const v of values) {
            const key = v.toString();
            dist[key] = (dist[key] ?? 0) + 1;
          }
          stat.distribution = dist;
        }
      }

      return stat;
    });

    // Responses over time (group by date)
    const dateCountMap: Record<string, number> = {};
    for (const sub of submissions) {
      const dateKey = sub.submittedAt.toISOString().slice(0, 10);
      dateCountMap[dateKey] = (dateCountMap[dateKey] ?? 0) + 1;
    }
    const responsesOverTime = Object.entries(dateCountMap).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      formId,
      totalResponses,
      completionRate,
      averageTimeSeconds: 0,
      questionStats,
      responsesOverTime,
    };
  }
}
