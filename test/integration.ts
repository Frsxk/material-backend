import { describe, expect, it } from 'bun:test';
import { app } from '../src';

function req(path: string, options?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, options));
}

function authReq(path: string, token: string, options?: RequestInit) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      ...options,
      headers: {
        ...(options?.headers as Record<string, string>),
        Authorization: `Bearer ${token}`,
      },
    })
  );
}

describe('Material Forms API', () => {
  let token = '';
  let userEmail = '';
  let formId = '';

  it('GET / — health check', async () => {
    const res = await req('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('POST /auth/register — creates a new user', async () => {
    userEmail = `test-${Date.now()}@example.com`;
    const res = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: userEmail, password: 'password123' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeString();
    expect(body.user.email).toBe(userEmail);
    token = body.token;
  });

  it('POST /auth/register — duplicate email returns 409', async () => {
    const res = await req('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dup', email: userEmail, password: 'password123' }),
    });
    expect(res.status).toBe(409);
  });

  it('POST /auth/login — returns token', async () => {
    const res = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'password123' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeString();
    token = body.token;
  });

  it('GET /auth/me — returns authenticated user', async () => {
    const res = await authReq('/auth/me', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(userEmail);
  });

  it('GET /auth/me — 401 without token', async () => {
    const res = await req('/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /forms — creates a form', async () => {
    const res = await authReq('/forms', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Integration Test Form' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Integration Test Form');
    formId = body.id;
  });

  it('GET /forms — lists user forms', async () => {
    const res = await authReq('/forms', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /forms/:id — updates form with questions', async () => {
    const res = await authReq(`/forms/${formId}`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Test Form',
        questions: [
          { id: 'q1', type: 'multiple_choice', title: 'Favorite color?', required: true, options: [{ id: 'o1', label: 'Red' }, { id: 'o2', label: 'Blue' }] },
          { id: 'q2', type: 'short_text', title: 'Your name?', required: false },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated Test Form');
  });

  it('POST /forms/:id/publish — publishes form', async () => {
    const res = await authReq(`/forms/${formId}/publish`, token, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
  });

  it('GET /public/forms/:id — fetches published form', async () => {
    const res = await req(`/public/forms/${formId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(formId);
    expect(Array.isArray(body.questions)).toBe(true);
  });

  it('POST /public/forms/:id/submit — submits response', async () => {
    const res = await req(`/public/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { q1: 'o1', q2: 'Alice' } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBeString();
    expect(body.submittedAt).toBeString();
  });

  it('POST /public/forms/:id/submit — missing required returns 422', async () => {
    const res = await req(`/public/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { q2: 'Bob' } }),
    });
    expect(res.status).toBe(422);
  });

  it('POST /public/forms/:id/submit — rate limited on rapid resubmit', async () => {
    const res = await req(`/public/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { q1: 'o2', q2: 'Charlie' } }),
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('GET /forms/:id/stats — returns form stats', async () => {
    const res = await authReq(`/forms/${formId}/stats`, token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalResponses).toBe(1);
    expect(body.questionStats[0]?.distribution?.Red).toBe(1);
  });

  it('GET /forms/:id/export — downloads CSV', async () => {
    const res = await authReq(`/forms/${formId}/export`, token);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('.csv');
    const csv = await res.text();
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Submission ID');
    expect(lines[0]).toContain('Favorite color?');
    expect(lines[0]).toContain('Your name?');
    // Data row should have resolved option label
    expect(lines[1]).toContain('Red');
    expect(lines[1]).toContain('Alice');
  });

  it('GET /forms/:id/export — 401 without token', async () => {
    const res = await req(`/forms/${formId}/export`);
    expect(res.status).toBe(401);
  });

  it('DELETE /forms/:id — deletes form', async () => {
    const res = await authReq(`/forms/${formId}`, token, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('GET /forms/:id — returns 404 after deletion', async () => {
    const res = await authReq(`/forms/${formId}`, token);
    expect(res.status).toBe(404);
  });
});
