// Run with: npm test   (uses Node's built-in test runner, no extra dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');

const { categorize, buildTitle } = require('../src/utils/categorizer');
const { formatTicketId, TICKET_REGEX } = require('../src/utils/ticket');
const { parseModelJson, normalizeAnalysis } = require('../src/utils/aiParsing');
const { fallbackAnalyze } = require('../src/utils/fallbackBot');
const { CATEGORIES, PRIORITIES } = require('../src/constants');

test.describe('ticket ids', () => {
  test('formats with zero padding', () => {
    assert.equal(formatTicketId(2026, 1), 'GRV-2026-00001');
    assert.equal(formatTicketId(2026, 123), 'GRV-2026-00123');
    assert.equal(formatTicketId(2027, 123456), 'GRV-2027-123456');
  });
  test('regex finds ids inside text, case-insensitive', () => {
    assert.equal('what about grv-2026-00042 please'.match(TICKET_REGEX)[0], 'grv-2026-00042');
    assert.equal('no ticket here'.match(TICKET_REGEX), null);
  });
});

test.describe('categorizer', () => {
  const cases = [
    ['My hall ticket for the semester exam is not available', 'Exams'],
    ['The hostel mess food is terrible and the warden ignores us', 'Hostel'],
    ['I paid my tuition fee but the receipt shows pending', 'Fees'],
    ['Bus route 7 is always late and the driver is rude', 'Transport'],
    ['The professor is biased and never answers questions', 'Faculty'],
    ['The projector in the classroom is broken and the library roof leaks', 'Infrastructure'],
    ['Attendance is not updated and the timetable has a clash', 'Academic'],
  ];
  for (const [text, expected] of cases) {
    test(`"${text}" -> ${expected}`, () => assert.equal(categorize(text).category, expected));
  }
  test('hostel beats generic infrastructure words', () => {
    assert.equal(categorize('Hostel wifi and water supply are down').category, 'Hostel');
  });
  test('unknown text -> Other with zero confidence', () => {
    const r = categorize('lorem ipsum dolor sit amet');
    assert.equal(r.category, 'Other');
    assert.equal(r.confidence, 0);
  });
  test('priority detection', () => {
    assert.equal(categorize('A senior is harassing me in the hostel').priority, 'Urgent');
    assert.equal(categorize('No hot water for 5 days in the hostel').priority, 'High');
    assert.equal(categorize('A small suggestion to improve the canteen menu').priority, 'Low');
    assert.equal(categorize('The lab computer is slow').priority, 'Medium');
  });
  test('buildTitle truncates long text and keeps first sentence', () => {
    assert.equal(buildTitle('Short issue. Second sentence.'), 'Short issue.');
    assert.ok(buildTitle('x'.repeat(200)).length <= 80);
  });
});

test.describe('parseModelJson', () => {
  test('plain JSON', () => assert.deepEqual(parseModelJson('{"a":1}'), { a: 1 }));
  test('markdown fenced JSON', () => assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 }));
  test('JSON surrounded by prose', () => assert.deepEqual(parseModelJson('Sure! {"a":1} hope that helps'), { a: 1 }));
  test('garbage -> null', () => {
    assert.equal(parseModelJson('not json'), null);
    assert.equal(parseModelJson(undefined), null);
  });
});

test.describe('normalizeAnalysis', () => {
  test('valid create_complaint passes through', () => {
    const r = normalizeAnalysis({
      action: 'create_complaint',
      reply: 'Filing it now.',
      complaint: { title: 'No hot water', description: 'Block C has had no hot water for two weeks.', category: 'Hostel', priority: 'High' },
    });
    assert.equal(r.action, 'create_complaint');
    assert.equal(r.complaint.category, 'Hostel');
    assert.equal(r.complaint.priority, 'High');
  });
  test('invalid category/priority are repaired, never trusted', () => {
    const r = normalizeAnalysis({
      action: 'create_complaint',
      reply: 'ok',
      complaint: { title: 'Exam hall ticket missing', description: 'My hall ticket for the exam is missing from the portal.', category: 'HACKED', priority: 'ULTRA' },
    });
    assert.ok(CATEGORIES.includes(r.complaint.category));
    assert.ok(PRIORITIES.includes(r.complaint.priority));
    assert.equal(r.complaint.category, 'Exams');
  });
  test('create_complaint without usable description downgrades to ask_more', () => {
    const r = normalizeAnalysis({ action: 'create_complaint', reply: 'ok', complaint: {} }, 'hi');
    assert.equal(r.action, 'ask_more');
    assert.equal(r.complaint, null);
  });
  test('falls back to student text when model omits description', () => {
    const r = normalizeAnalysis({ action: 'create_complaint', reply: 'ok', complaint: { title: 'Fees issue' } }, 'I paid my fees twice and need a refund please');
    assert.equal(r.action, 'create_complaint');
    assert.match(r.complaint.description, /refund/);
  });
  test('unknown action or empty reply -> null (caller uses fallback)', () => {
    assert.equal(normalizeAnalysis({ action: 'delete_everything', reply: 'x' }), null);
    assert.equal(normalizeAnalysis({ action: 'answer', reply: '' }), null);
    assert.equal(normalizeAnalysis(null), null);
  });
  test('reply is capped in length', () => {
    const r = normalizeAnalysis({ action: 'answer', reply: 'a'.repeat(5000) });
    assert.equal(r.reply.length, 1500);
  });
});

test.describe('fallback bot', () => {
  test('greeting', () => {
    const r = fallbackAnalyze(['Hello!']);
    assert.equal(r.action, 'answer');
  });
  test('short vague message asks for more detail', () => {
    const r = fallbackAnalyze(['bad hostel']);
    assert.equal(r.action, 'ask_more');
  });
  test('detailed message creates a categorised complaint', () => {
    const r = fallbackAnalyze(['The hostel mess food has been terrible for two weeks and the warden is ignoring our complaints.']);
    assert.equal(r.action, 'create_complaint');
    assert.equal(r.complaint.category, 'Hostel');
  });
  test('a greeting before the real complaint does not leak into the ticket', () => {
    const r = fallbackAnalyze(['Hello', 'The hostel mess food has been terrible for two weeks and the warden is ignoring us.']);
    assert.equal(r.action, 'create_complaint');
    assert.notEqual(r.complaint.title, 'Hello');
    assert.match(r.complaint.title, /hostel mess/i);
    assert.ok(!/^hello/i.test(r.complaint.description));
  });
  test('repeated greetings only get a greeting back', () => {
    assert.equal(fallbackAnalyze(['Hi', 'hello']).action, 'answer');
  });
  test('after one follow-up a shorter answer is enough', () => {
    const r = fallbackAnalyze(['bus problem', 'It is always late in the morning'], 1);
    assert.equal(r.action, 'create_complaint');
    assert.equal(r.complaint.category, 'Transport');
  });
});
