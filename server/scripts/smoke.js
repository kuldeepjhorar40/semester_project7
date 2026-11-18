/* End-to-end API smoke test. Requires the server running AND seeded data:
 *   npm run seed && npm run dev      (terminal 1)
 *   npm run smoke                    (terminal 2)
 * Override the target with API_URL=http://host:port/api
 */
const BASE = process.env.API_URL || 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}\n        -> ${err.message}`);
  }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

(async () => {
  console.log(`Smoke testing ${BASE}\n`);
  const email = `smoke${Date.now()}@student.edu`;
  const password = 'Smoke1234';
  let studentToken; let adminToken; let ticketId; let complaintId; let adminId;

  console.log('Health & validation');
  await check('GET /health responds ok', async () => {
    const r = await call('GET', '/health');
    expect(r.status === 200 && r.data.status === 'ok', `status ${r.status}`);
    console.log(`        (AI mode: ${r.data.ai})`);
  });
  await check('register rejects weak password (400)', async () => {
    const r = await call('POST', '/auth/register', { body: { name: 'X Y', email, password: 'short' } });
    expect(r.status === 400, `status ${r.status}`);
  });
  await check('register rejects invalid email (400)', async () => {
    const r = await call('POST', '/auth/register', { body: { name: 'X Y', email: 'nope', password } });
    expect(r.status === 400, `status ${r.status}`);
  });

  console.log('\nStudent auth');
  await check('register student (201) and role is student even if admin requested', async () => {
    const r = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password, role: 'admin' } });
    expect(r.status === 201, `status ${r.status} ${JSON.stringify(r.data)}`);
    expect(r.data.user.role === 'student', 'privilege escalation possible!');
    expect(!('password' in r.data.user), 'password leaked');
    studentToken = r.data.token;
  });
  await check('duplicate email rejected (409)', async () => {
    const r = await call('POST', '/auth/register', { body: { name: 'Smoke Tester', email, password } });
    expect(r.status === 409, `status ${r.status}`);
  });
  await check('login with wrong password (401)', async () => {
    const r = await call('POST', '/auth/login', { body: { email, password: 'Wrong1234' } });
    expect(r.status === 401, `status ${r.status}`);
  });
  await check('login works and /auth/me returns the user', async () => {
    const r = await call('POST', '/auth/login', { body: { email, password } });
    expect(r.status === 200 && r.data.token, `status ${r.status}`);
    studentToken = r.data.token;
    const me = await call('GET', '/auth/me', { token: studentToken });
    expect(me.status === 200 && me.data.user.email === email, 'me failed');
  });
  await check('no token -> 401', async () => {
    expect((await call('GET', '/complaints')).status === 401, 'expected 401');
  });
  await check('garbage token -> 401', async () => {
    expect((await call('GET', '/complaints', { token: 'abc.def.ghi' })).status === 401, 'expected 401');
  });

  console.log('\nRole-based access');
  await check('student cannot open admin analytics (403)', async () => {
    expect((await call('GET', '/admin/analytics', { token: studentToken })).status === 403, 'expected 403');
  });
  await check('student cannot list all complaints (403)', async () => {
    expect((await call('GET', '/admin/complaints', { token: studentToken })).status === 403, 'expected 403');
  });

  console.log('\nChatbot -> complaint creation');
  await check('greeting gets a reply and does not create a ticket', async () => {
    const r = await call('POST', '/chat/message', { token: studentToken, body: { message: 'Hello' } });
    expect(r.status === 201 && r.data.botMessage.content, `status ${r.status}`);
    expect(!r.data.botMessage.complaint, 'ticket created for a greeting');
  });
  await check('empty message rejected (400)', async () => {
    expect((await call('POST', '/chat/message', { token: studentToken, body: { message: '   ' } })).status === 400, 'expected 400');
  });
  await check('detailed complaint is understood, categorised and gets a ticket ID', async () => {
    const msgs = [
      'The hostel mess food has been terrible for two weeks and there were insects in the dal yesterday in Block C. The warden is not responding.',
      'It happens at lunch and dinner every day in the Block C mess.',
      'Please escalate this, it affects around 200 students in Block C.',
    ];
    let result;
    for (const m of msgs) {
      result = await call('POST', '/chat/message', { token: studentToken, body: { message: m } });
      expect(result.status === 201, `chat status ${result.status} ${JSON.stringify(result.data)}`);
      if (result.data.botMessage.complaint) break;
    }
    const c = result.data.botMessage.complaint;
    expect(c && /^GRV-\d{4}-\d{5,}$/.test(c.ticketId), 'no valid ticket ID created');
    expect(c.category === 'Hostel', `category was ${c.category}`);
    ticketId = c.ticketId;
    complaintId = c._id;
  });
  await check('asking for status by ticket ID returns its status', async () => {
    const r = await call('POST', '/chat/message', { token: studentToken, body: { message: `What is the status of ${ticketId}?` } });
    expect(r.status === 201 && r.data.botMessage.content.includes('Pending'), `reply: ${r.data?.botMessage?.content}`);
  });
  await check('chat history is persisted', async () => {
    const r = await call('GET', '/chat/history', { token: studentToken });
    expect(r.status === 200 && r.data.messages.length >= 6, `only ${r.data?.messages?.length} messages`);
  });
  await check('student sees the complaint in their list and stats', async () => {
    const list = await call('GET', '/complaints?status=Pending', { token: studentToken });
    expect(list.data.items.some((c) => c.ticketId === ticketId), 'ticket missing from list');
    const stats = await call('GET', '/complaints/stats/summary', { token: studentToken });
    expect(stats.data.total >= 1 && stats.data.byStatus.Pending >= 1, 'stats wrong');
  });
  await check('student gets a "registered" notification', async () => {
    const r = await call('GET', '/notifications', { token: studentToken });
    expect(r.data.items.some((n) => n.type === 'created') && r.data.unreadCount >= 1, 'no notification');
  });

  console.log('\nAdmin workflow');
  await check('admin login (seeded account)', async () => {
    const r = await call('POST', '/auth/login', { body: { email: 'admin@university.edu', password: 'Admin@123' } });
    expect(r.status === 200 && r.data.user.role === 'admin', `status ${r.status} - did you run "npm run seed"?`);
    adminToken = r.data.token;
    adminId = r.data.user._id;
  });
  await check('admin can list/filter/search complaints', async () => {
    const r = await call('GET', `/admin/complaints?q=${ticketId}`, { token: adminToken });
    expect(r.status === 200 && r.data.items.length === 1, `found ${r.data?.items?.length}`);
    const f = await call('GET', '/admin/complaints?category=Hostel&status=Pending&limit=5', { token: adminToken });
    expect(f.status === 200 && f.data.items.every((c) => c.category === 'Hostel'), 'filter broken');
  });
  await check('bad filter value rejected (400)', async () => {
    expect((await call('GET', '/admin/complaints?status=Bogus', { token: adminToken })).status === 400, 'expected 400');
  });
  await check('assigning moves Pending -> In Progress', async () => {
    const r = await call('PATCH', `/admin/complaints/${complaintId}`, { token: adminToken, body: { assignedTo: adminId } });
    expect(r.status === 200, `status ${r.status} ${JSON.stringify(r.data)}`);
    expect(r.data.complaint.status === 'In Progress', `status ${r.data.complaint.status}`);
    expect(r.data.complaint.assignedTo._id === adminId, 'not assigned');
  });
  await check('resolving without a remark is rejected (400)', async () => {
    const r = await call('PATCH', `/admin/complaints/${complaintId}`, { token: adminToken, body: { status: 'Resolved' } });
    expect(r.status === 400, `status ${r.status}`);
  });
  await check('resolving with a remark works and records history', async () => {
    const r = await call('PATCH', `/admin/complaints/${complaintId}`, { token: adminToken, body: { status: 'Resolved', remark: 'Mess contractor warned and kitchen cleaned.' } });
    expect(r.status === 200 && r.data.complaint.status === 'Resolved', `status ${r.status}`);
    expect(r.data.complaint.resolvedAt, 'resolvedAt missing');
    expect(r.data.complaint.statusHistory.length >= 3, 'history not recorded');
  });
  await check('student is notified and can read the remark', async () => {
    const n = await call('GET', '/notifications', { token: studentToken });
    expect(n.data.items.some((x) => x.type === 'status' && /Resolved/.test(x.message)), 'no status notification');
    const c = await call('GET', `/complaints/${complaintId}`, { token: studentToken });
    expect(c.status === 200 && c.data.complaint.remarks.length >= 1, 'remark not visible');
  });
  await check('mark-all-read zeroes the unread counter', async () => {
    await call('PATCH', '/notifications/read-all', { token: studentToken });
    const n = await call('GET', '/notifications', { token: studentToken });
    expect(n.data.unreadCount === 0, `unread ${n.data.unreadCount}`);
  });
  await check('another student cannot open this complaint (404)', async () => {
    const other = await call('POST', '/auth/login', { body: { email: 'priya@student.edu', password: 'Student@123' } });
    expect(other.status === 200, 'seeded student login failed');
    const r = await call('GET', `/complaints/${complaintId}`, { token: other.data.token });
    expect(r.status === 404, `status ${r.status}`);
  });
  await check('analytics returns totals, charts data and 6 months', async () => {
    const r = await call('GET', '/admin/analytics', { token: adminToken });
    expect(r.status === 200, `status ${r.status}`);
    const d = r.data;
    expect(d.totals.total >= 30, `total ${d.totals.total}`);
    expect(d.byStatus.length === 4 && d.byCategory.length >= 7 && d.monthly.length === 6, 'shape wrong');
    expect(d.totals.resolved >= 1 && d.totals.avgResolutionHours >= 0, 'resolution stats wrong');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('\nCould not reach the API. Is the server running?\n', e.message);
  process.exit(1);
});
