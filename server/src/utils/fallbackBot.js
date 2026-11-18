// Rule-based assistant used when Gemini is not configured or temporarily failing.
const { categorize, buildTitle } = require('./categorizer');

const GREETING = /^\s*(hi|hello|hey|good (morning|afternoon|evening)|namaste|hola)\b[\s!.?]*$/i;
const HELP = /^\s*(help|what can you do|how does this work|how do i (file|raise|submit)).{0,40}$/i;

const wordCount = (t) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * @param {string[]} studentTexts all student messages of the current (unfiled) conversation
 * @param {number} followUps number of clarifying questions the bot already asked
 */
function fallbackAnalyze(allStudentTexts, followUps = 0) {
  // Greetings are never part of a complaint (so "Hello" + a later description does not leak into the ticket)
  const studentTexts = allStudentTexts.filter((t) => !GREETING.test(t));
  if (studentTexts.length === 0) {
    return {
      action: 'answer',
      reply: "Hello! I'm UniHelp, your grievance assistant. Tell me about any issue you're facing (exams, hostel, fees, transport, faculty, academics or infrastructure) and I'll file a ticket for you.",
      complaint: null,
    };
  }
  const last = studentTexts[studentTexts.length - 1];
  if (studentTexts.length === 1 && HELP.test(last)) {
    return {
      action: 'answer',
      reply: 'Just describe your problem in your own words. I will categorise it, create a ticket ID and the administration will review it. You can check progress anytime by sending me your ticket ID (like GRV-2026-00001) or from the My Complaints page.',
      complaint: null,
    };
  }

  const combined = studentTexts.join(' ').replace(/\s+/g, ' ').trim();
  const words = wordCount(combined);
  const { category, priority, confidence } = categorize(combined);

  const enoughDetail =
    words >= 12 || (followUps >= 1 && words >= 5) || (confidence >= 3 && words >= 8);

  if (enoughDetail) {
    return {
      action: 'create_complaint',
      reply: `Thank you for explaining. I've logged this under ${category} with ${priority} priority and sent it to the administration.`,
      // title from the most descriptive (longest) message, not necessarily the first one
      complaint: { title: buildTitle([...studentTexts].sort((a, b) => b.length - a.length)[0]), description: combined, category, priority },
    };
  }
  return {
    action: 'ask_more',
    reply: "I'm sorry you're facing this. Could you share a little more detail, such as what exactly happened, where, and since when? Then I can file it properly.",
    complaint: null,
  };
}

module.exports = { fallbackAnalyze };
