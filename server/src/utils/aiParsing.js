// Parsing/validation of Gemini output. Pure functions, no network or DB.
const { CATEGORIES, PRIORITIES } = require('../constants');
const { categorize, buildTitle } = require('./categorizer');

const ACTIONS = ['ask_more', 'create_complaint', 'answer'];

function parseModelJson(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return null;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Turns whatever the model returned into a safe, well-formed analysis object.
 * Returns null when the output is unusable (caller should use the fallback bot).
 * @returns {{action: string, reply: string, complaint: null | {title: string, description: string, category: string, priority: string}} | null}
 */
function normalizeAnalysis(obj, studentText = '') {
  if (!obj || typeof obj !== 'object') return null;
  const reply = str(obj.reply).slice(0, 1500);
  let action = ACTIONS.includes(obj.action) ? obj.action : null;
  if (!action || !reply) return null;

  let complaint = null;
  if (action === 'create_complaint') {
    const c = obj.complaint && typeof obj.complaint === 'object' ? obj.complaint : {};
    const description = str(c.description).slice(0, 3000) || str(studentText).slice(0, 3000);
    if (description.length < 10) {
      action = 'ask_more'; // nothing meaningful to file
    } else {
      const guess = categorize(`${str(c.title)} ${description}`);
      complaint = {
        title: (str(c.title) || buildTitle(description)).slice(0, 120),
        description,
        category: CATEGORIES.includes(c.category) ? c.category : guess.category,
        priority: PRIORITIES.includes(c.priority) ? c.priority : guess.priority,
      };
    }
  }
  return { action, reply, complaint };
}

module.exports = { parseModelJson, normalizeAnalysis, ACTIONS };
