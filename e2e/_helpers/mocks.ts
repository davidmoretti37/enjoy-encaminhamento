import type { Page, Route } from "@playwright/test";

// OpenRouter chat-completions response stub. The matching pipeline expects
// JSON content in the message body — return a plausible shape so downstream
// scoring code doesn't crash.
function buildOpenRouterChatStub(candidates: number = 15) {
  const ranked = Array.from({ length: candidates }, (_, i) => ({
    candidateId: `mock-candidate-${i}`,
    refinedScore: 90 - i * 2,
    confidence: 0.9 - i * 0.02,
    recommendation:
      i < 3 ? "HIGHLY_RECOMMENDED" : i < 8 ? "RECOMMENDED" : "CONSIDER",
    discAnalysis: "Mock DISC analysis.",
    competencyAnalysis: "Mock PDP analysis.",
    companyFitNotes: "Mock company-fit notes.",
    strengths: ["Mock strength A", "Mock strength B"],
    concerns: ["Mock concern A"],
  }));

  return {
    id: "mock-chatcmpl",
    object: "chat.completion",
    model: "mock-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({ ranked }),
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 },
  };
}

function buildEmbeddingStub(input: string | string[]) {
  const arr = Array.isArray(input) ? input : [input];
  return {
    object: "list",
    data: arr.map((_, i) => ({
      object: "embedding",
      embedding: Array.from({ length: 1536 }, (_, k) => Math.sin(i + k) * 0.01),
      index: i,
    })),
    model: "text-embedding-3-small",
    usage: { prompt_tokens: arr.length * 10, total_tokens: arr.length * 10 },
  };
}

// Intercepts all outbound OpenRouter calls. Call once per test page.
export async function mockOpenRouter(page: Page) {
  await page.route("**/openrouter.ai/**", async (route: Route) => {
    const url = route.request().url();
    const body =
      url.includes("/embeddings")
        ? buildEmbeddingStub("")
        : buildOpenRouterChatStub();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

// Autentique GraphQL — return a fake document with deterministic IDs.
export async function mockAutentique(page: Page) {
  await page.route("**/api.autentique.com.br/**", async (route: Route) => {
    const body = {
      data: {
        createDocumentV2: {
          id: "mock-autentique-doc-" + Date.now(),
          name: "Mock Document",
          signatures: [
            { public_id: "mock-signer-1", email: "company@example.test", action: { name: "SIGN" } },
            { public_id: "mock-signer-2", email: "candidate@example.test", action: { name: "SIGN" } },
          ],
        },
      },
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

// Convenience: install both at once.
export async function mockExternal(page: Page) {
  await mockOpenRouter(page);
  await mockAutentique(page);
}
