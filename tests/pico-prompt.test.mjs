import assert from "node:assert/strict";

const CLAUDE_TIMEOUT_MS = 60000;
const PICO_INSTRUCTION = `Rewrite my recall question as an EBM foreground question. Shift "what/which" to "what's the evidence for/why." Impose PICO (population, intervention/exposure, comparator, outcome) and pick the right question type (therapy/diagnosis/prognosis). Require cited evidence, guideline comparison, and clinical implications--not just definitions.

Export as JSON:
{"question":"$output"}`;

function buildPicoPrompt(selection) {
  return `${PICO_INSTRUCTION}\n\n+++user selection+++\n${selection}`;
}

function extractPicoQuestion(content) {
  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) {
    throw new Error("Claude returned an empty response");
  }

  try {
    const parsed = JSON.parse(trimmed);
    const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
    if (question) {
      return question;
    }
  } catch (_error) {
    const match = trimmed.match(/"question"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (match) {
      const parsed = JSON.parse(`{"question":"${match[1]}"}`);
      const question = parsed.question.trim();
      if (question) {
        return question;
      }
    }
  }

  return trimmed;
}

const prompt = buildPicoPrompt("how to treat MPN");

assert.match(prompt, /Impose PICO/);
assert.match(prompt, /therapy\/diagnosis\/prognosis/);
assert.match(prompt, /Export as JSON/);
assert.match(prompt, /\{"question":"\$output"\}/);
assert.match(prompt, /\+\+\+user selection\+\+\+\nhow to treat MPN/);
assert.equal(CLAUDE_TIMEOUT_MS, 60000);

assert.equal(extractPicoQuestion('{"question":"What is the evidence for aspirin in MPN?"}'), "What is the evidence for aspirin in MPN?");
assert.equal(
  extractPicoQuestion('```json\n{"question":"Why use cytoreduction in high-risk PV?"}\n```'),
  "Why use cytoreduction in high-risk PV?"
);
