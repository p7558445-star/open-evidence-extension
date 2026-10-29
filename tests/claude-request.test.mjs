import assert from "node:assert/strict";

const CLAUDE_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
const DEFAULT_CLAUDE_MODEL = "claude-opus-5-5";
const CLAUDE_FALLBACK_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5"];
const PICO_SCHEMA = {
  type: "object",
  properties: { question: { type: "string" } },
  required: ["question"],
  additionalProperties: false,
};

function normalizeClaudeModel(value) {
  return CLAUDE_MODELS.includes(value) ? value : DEFAULT_CLAUDE_MODEL;
}

function buildClaudeRequest(model, prompt, options = {}) {
  const body = {
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "low" },
  };
  const headers = {
    "x-api-key": options.apiKey,
    "anthropic-version": "2026-10-21",
    "anthropic-dangerous-direct-browser-access": "true",
    "content-type": "application/json",
  };

  if (options.jsonSchema) {
    body.output_config.format = {
      type: "json_schema",
      schema: options.jsonSchema,
    };
  }

  if (CLAUDE_FALLBACK_MODELS.includes(model)) {
    body.fallbacks = "default";
    headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
  }

  return { headers, body };
}

function extractClaudeText(data) {
  if (data?.stop_reason === "refusal") {
    throw new Error("Claude declined this request");
  }

  const text = Array.isArray(data?.content)
    ? data.content
        .filter((block) => block?.type === "text")
        .map((block) => block.text)
        .join("")
        .trim()
    : "";
  if (!text) {
    throw new Error("Claude returned an empty response");
  }

  return text;
}

assert.equal(normalizeClaudeModel("claude-haiku-5-5"), "claude-haiku-5-5");
assert.equal(normalizeClaudeModel("llama-3.3-70b-versatile"), DEFAULT_CLAUDE_MODEL);
assert.equal(normalizeClaudeModel(undefined), DEFAULT_CLAUDE_MODEL);

const pico = buildClaudeRequest("claude-opus-5-5", "rewrite", {
  apiKey: "sk-test",
  jsonSchema: PICO_SCHEMA,
});
assert.equal(pico.headers["x-api-key"], "sk-test");
assert.equal(pico.headers["anthropic-dangerous-direct-browser-access"], "true");
assert.equal(pico.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
assert.equal(pico.body.fallbacks, "default");
assert.deepEqual(pico.body.output_config.format, { type: "json_schema", schema: PICO_SCHEMA });
assert.equal("temperature" in pico.body, false);
assert.equal("thinking" in pico.body, false);

const haiku = buildClaudeRequest("claude-haiku-5-5", "rewrite", { apiKey: "k" });
assert.equal("fallbacks" in haiku.body, false);
assert.equal("anthropic-beta" in haiku.headers, false);
assert.equal("format" in haiku.body.output_config, false);

assert.equal(
  extractClaudeText({
    stop_reason: "end_turn",
    content: [
      { type: "thinking", thinking: "" },
      { type: "text", text: ' {"question":"Why?"} ' },
    ],
  }),
  '{"question":"Why?"}',
);
assert.throws(() => extractClaudeText({ stop_reason: "refusal", content: [] }), /declined/);
assert.throws(() => extractClaudeText({ content: [{ type: "thinking", thinking: "" }] }), /empty/);
