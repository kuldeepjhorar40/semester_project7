// Keyword based categoriser + priority estimator.
// Used (a) as a fallback when Gemini is unavailable and (b) to repair/validate model output.
const RULES = {
  Academic: {
    strong: ['syllabus', 'curriculum', 'timetable', 'attendance', 'lecture', 'elective', 'internal marks', 'assignment'],
    weak: ['course', 'subject', 'class', 'classes', 'semester', 'grading', 'lab hours', 'schedule', 'registration'],
  },
  Exams: {
    strong: ['exam', 'exams', 'examination', 'hall ticket', 'admit card', 'revaluation', 're-evaluation', 'question paper', 'answer sheet', 'supplementary', 'backlog'],
    weak: ['result', 'results', 'marks', 'invigilator', 'retotaling', 'paper', 'grade card', 'marksheet'],
  },
  Hostel: {
    strong: ['hostel', 'warden', 'mess', 'roommate', 'dorm', 'dormitory', 'laundry', 'curfew'],
    weak: ['room', 'bunk', 'mattress', 'canteen', 'food', 'night out', 'visitor'],
  },
  Fees: {
    strong: ['fee', 'fees', 'tuition', 'scholarship', 'refund', 'challan', 'late fee', 'dues', 'stipend'],
    weak: ['payment', 'paid', 'receipt', 'fine', 'installment', 'instalment', 'deducted', 'invoice'],
  },
  Transport: {
    strong: ['bus', 'buses', 'transport', 'shuttle', 'bus pass', 'bus stop', 'pickup'],
    weak: ['route', 'driver', 'van', 'conductor', 'commute'],
  },
  Faculty: {
    strong: ['professor', 'faculty', 'lecturer', 'teacher', 'mentor', 'hod', 'prof'],
    weak: ['rude', 'biased', 'unfair', 'misbehave', 'misbehaved', 'not teaching', 'discriminat', 'favouritism', 'favoritism'],
  },
  Infrastructure: {
    strong: ['classroom', 'projector', 'library', 'washroom', 'toilet', 'elevator', 'lift', 'air conditioner', 'power cut', 'electricity', 'furniture'],
    weak: ['wifi', 'wi-fi', 'internet', 'water', 'broken', 'leak', 'leaking', 'fan', 'light', 'lights', 'bench', 'parking', 'campus', 'ground', 'lab equipment', 'computer lab', 'drinking water'],
  },
};

const URGENT = /\b(harass\w*|ragging|assault\w*|threat\w*|unsafe|safety|fire|emergency|medical|injur\w*|faint\w*|electric shock|short circuit|food poison\w*|molest\w*|bully\w*|stalk\w*)\b/i;
const HIGH = /\b(urgent\w*|asap|immediately|deadline|last date|penalty|detained|debarred|withheld|(\d+|several|many|few) (days|weeks|months))\b/i;
const LOW = /\b(suggest\w*|suggestion|minor|small issue|improve\w*|would be nice|request)\b/i;

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const compiled = {};
for (const [cat, { strong, weak }] of Object.entries(RULES)) {
  compiled[cat] = {
    strong: strong.map((t) => new RegExp(`\\b${escapeRe(t)}`, 'i')),
    weak: weak.map((t) => new RegExp(`\\b${escapeRe(t)}`, 'i')),
  };
}

function estimatePriority(text) {
  if (URGENT.test(text)) return 'Urgent';
  if (HIGH.test(text)) return 'High';
  if (LOW.test(text)) return 'Low';
  return 'Medium';
}

/**
 * @param {string} text
 * @returns {{category: string, priority: string, confidence: number, scores: Record<string, number>}}
 */
function categorize(text = '') {
  const scores = {};
  for (const [cat, { strong, weak }] of Object.entries(compiled)) {
    let s = 0;
    strong.forEach((re) => { if (re.test(text)) s += 3; });
    weak.forEach((re) => { if (re.test(text)) s += 1; });
    scores[cat] = s;
  }
  const [bestCat, bestScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return {
    category: bestScore > 0 ? bestCat : 'Other',
    priority: estimatePriority(text),
    confidence: bestScore,
    scores,
  };
}

function buildTitle(text = '', max = 80) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0] || clean;
  if (firstSentence.length <= max) return firstSentence;
  return `${firstSentence.slice(0, max - 1).trimEnd()}…`;
}

module.exports = { categorize, estimatePriority, buildTitle };
