// Pure helpers for ticket IDs (no DB access, so they are unit-testable).
const TICKET_REGEX = /\bGRV-\d{4}-\d{5,}\b/i;

function formatTicketId(year, seq) {
  return `GRV-${year}-${String(seq).padStart(5, '0')}`;
}

module.exports = { TICKET_REGEX, formatTicketId };
