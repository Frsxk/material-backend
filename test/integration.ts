/**
 * Integration test — run with: bun test/integration.ts
 * Requires the server to NOT be running (starts its own instance).
 */
const BASE = 'http://localhost:5000';

async function json(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function main() {
  // Start server in background
  const server = Bun.spawn(['bun', 'src/index.ts'], { cwd: import.meta.dir + '/..', stdout: 'pipe', stderr: 'pipe' });
  await Bun.sleep(3000);

  let token = '';
  let formId = '';
  let passed = 0;
  let failed = 0;

  function assert(label: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`✅ ${label}`);
      passed++;
    } else {
      console.log(`❌ ${label}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  }

  try {
    // 1. Health
    const health = await json(await fetch(BASE + '/'));
    assert('Health check', health.status === 'ok');

    // 2. Register
    const reg = await json(await fetch(BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: `test-${Date.now()}@example.com`, password: 'password123' }),
    }));
    assert('Register returns token', typeof reg.token === 'string', JSON.stringify(reg));
    assert('Register returns user', reg.user?.email?.includes('@'), JSON.stringify(reg));
    token = reg.token;

    // 3. Duplicate register
    const dup = await fetch(BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: reg.user.email, password: 'password123' }),
    });
    assert('Duplicate register → 409', dup.status === 409);

    // 4. Login
    const login = await json(await fetch(BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: reg.user.email, password: 'password123' }),
    }));
    assert('Login returns token', typeof login.token === 'string', JSON.stringify(login));
    token = login.token;

    // 5. Get me
    const me = await json(await fetch(BASE + '/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }));
    assert('GET /auth/me returns user', me.email === reg.user.email, JSON.stringify(me));

    // 6. Unauthenticated /auth/me
    const noAuth = await fetch(BASE + '/auth/me');
    assert('GET /auth/me without token → 401', noAuth.status === 401);

    // 7. Create form
    const form = await json(await fetch(BASE + '/forms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Integration Test Form' }),
    }));
    assert('Create form', form.id && form.title === 'Integration Test Form', JSON.stringify(form));
    formId = form.id;

    // 8. List forms
    const forms = await json(await fetch(BASE + '/forms', {
      headers: { Authorization: `Bearer ${token}` },
    }));
    assert('List forms returns array', Array.isArray(forms) && forms.length >= 1);

    // 9. Update form with questions
    const updated = await json(await fetch(BASE + `/forms/${formId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Test Form',
        questions: [
          { id: 'q1', type: 'multiple_choice', title: 'Favorite color?', required: true, options: [{ id: 'o1', label: 'Red' }, { id: 'o2', label: 'Blue' }] },
          { id: 'q2', type: 'short_text', title: 'Your name?', required: false },
        ],
      }),
    }));
    assert('Update form', updated.title === 'Updated Test Form', JSON.stringify(updated));

    // 10. Publish form
    const pub = await json(await fetch(BASE + `/forms/${formId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }));
    assert('Publish form', pub.status === 'published', JSON.stringify(pub));

    // 11. Public form fetch
    const pubForm = await json(await fetch(BASE + `/public/forms/${formId}`));
    assert('Public form fetch', pubForm.id === formId && Array.isArray(pubForm.questions), JSON.stringify(pubForm).slice(0, 100));

    // 12. Submit response
    const sub = await json(await fetch(BASE + `/public/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { q1: 'o1', q2: 'Alice' } }),
    }));
    assert('Submit response', sub.id && sub.submittedAt, JSON.stringify(sub));

    // 13. Submit missing required
    const badSub = await fetch(BASE + `/public/forms/${formId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { q2: 'Bob' } }),
    });
    assert('Missing required → 422', badSub.status === 422);

    // 14. Stats
    const stats = await json(await fetch(BASE + `/forms/${formId}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }));
    assert('Stats totalResponses', stats.totalResponses === 1, JSON.stringify(stats).slice(0, 200));
    assert('Stats has distribution', stats.questionStats?.[0]?.distribution?.Red === 1);

    // 15. Delete form
    const del = await json(await fetch(BASE + `/forms/${formId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }));
    assert('Delete form', del.success === true);

    // 16. Verify deletion
    const gone = await fetch(BASE + `/forms/${formId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert('Deleted form → 404', gone.status === 404);

  } catch (err) {
    console.error('💥 Test error:', err);
    failed++;
  } finally {
    server.kill();
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

main();
