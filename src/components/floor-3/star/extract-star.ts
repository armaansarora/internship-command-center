export interface StarHints {
  situation: string[];
  task: string[];
  action: string[];
  result: string[];
}

// First-person action verbs. Expand judiciously — favour precision over recall.
// The implementation ALSO accepts any `I <verb>` where the verb ends in -ed / -t
// and has length > 3 (past-tense heuristic), so this set is a fast-path.
const ACTION_VERBS = new Set<string>([
  "built", "led", "negotiated", "decided", "shipped", "designed", "wrote",
  "launched", "drove", "ran", "managed", "coordinated", "presented",
  "refactored", "optimised", "optimized", "migrated", "analyzed", "analysed",
  "architected", "scaled", "reduced", "increased", "rolled", "saved",
  "prototyped", "delivered", "pitched", "closed", "owned", "rebuilt",
  "landed", "established", "defined", "unblocked", "tracked", "instrumented",
  "deployed", "released", "grew", "cut", "hired", "mentored", "automated",
  "fixed", "debugged", "documented", "trained", "reviewed", "taught",
  "simplified", "streamlined", "executed", "piloted",
]);

// Mental-state / non-action verbs to reject — these start with "I <verb>" but
// are NOT an Action.
const REJECT_FIRST_PERSON_VERBS = new Set<string>([
  "think", "thought", "feel", "felt", "believe", "believed",
  "wanted", "hoped", "liked", "disliked", "assumed", "guess", "guessed",
  "know", "knew", "understand", "understood",
]);

const TASK_TRIGGERS: RegExp[] = [
  /\bi\s+was\s+asked\s+to\s+([^.?!]+)/gi,
  /\bmy\s+job\s+was\s+to\s+([^.?!]+)/gi,
  /\bthe\s+goal\s+was\s+to\s+([^.?!]+)/gi,
  /\bi\s+needed\s+to\s+([^.?!]+)/gi,
  /\bi\s+had\s+to\s+([^.?!]+)/gi,
];

const SITUATION_TRIGGERS: RegExp[] = [
  /\b(?:when\s+i\s+was|in\s+my|at\s+my|during\s+my|last\s+(?:summer|year|quarter))\b\s+([^.?!]+)/gi,
  /\b(?:the\s+team\s+was|our\s+[a-z]+\s+was|the\s+[a-z]+\s+were|sales\s+pipelines\s+were)\b\s+([^.?!]+)/gi,
];

const RESULT_TRIGGERS: RegExp[] = [
  // Percentages
  /\b(\d+(?:\.\d+)?\s*(?:%|percent))\b[^.?!]*/gi,
  // Dollar amounts ($3M, $500k, $1.2b)
  /\$\s?\d+(?:\.\d+)?\s?[kmb]?[^.?!]*/gi,
  // Number + k/m/b suffix ("40k users")
  /\b\d+(?:\.\d+)?\s?[kmb]\b[^.?!]*/gi,
  // Outcome keywords leading the sentence
  /\b(?:resulted\s+in|saved|grew|cut|reduced|increased|drove|delivered|launched\s+to)\b\s+([^.?!]+)/gi,
];

function sentences(text: string): string[] {
  return text.split(/[.!?]+\s*/).map((s) => s.trim()).filter(Boolean);
}

function matchPatterns(text: string, patterns: RegExp[], limit: number): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    p.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.exec(text)) !== null && hits.length < limit) {
      const phrase = m[0].trim();
      if (phrase && !hits.includes(phrase)) hits.push(phrase);
    }
  }
  return hits.slice(0, limit);
}

function actionFromSentence(s: string): string | null {
  const m = /^\s*i\s+([a-z]+)/i.exec(s);
  if (!m) return null;
  const verb = m[1].toLowerCase();
  if (REJECT_FIRST_PERSON_VERBS.has(verb)) return null;
  const isPastTense = /(?:ed|t)$/.test(verb) && verb.length > 3;
  if (!ACTION_VERBS.has(verb) && !isPastTense) return null;
  return s.trim();
}

export function extractStar(text: string): StarHints {
  const out: StarHints = { situation: [], task: [], action: [], result: [] };
  if (!text || !text.trim()) return out;

  out.task = matchPatterns(text, TASK_TRIGGERS, 3);
  out.situation = matchPatterns(text, SITUATION_TRIGGERS, 3);

  for (const s of sentences(text)) {
    if (out.action.length >= 3) break;
    const hit = actionFromSentence(s);
    if (hit && !out.action.includes(hit)) out.action.push(hit);
  }

  out.result = matchPatterns(text, RESULT_TRIGGERS, 3);

  return out;
}
