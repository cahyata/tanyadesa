const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-flash-lite-latest";
export const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL ?? "gemini-embedding-001";
export const EMBED_DIM = Number(process.env.GEMINI_EMBED_DIM ?? 768);

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum diisi di .env.local");
  return key;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const maxAttempts = 4;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status === 503;
    if (retryable && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      continue;
    }
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini API ${res.status}: ${detail}`);
  }
}

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/** Mengubah teks menjadi vektor. Dikirim per batch maksimal 50 teks. */
export async function embedTexts(texts: string[], taskType: TaskType): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const res = await post<{ embeddings: { values: number[] }[] }>(
      `models/${EMBED_MODEL}:batchEmbedContents`,
      {
        requests: batch.map((text) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBED_DIM,
        })),
      },
    );
    for (const e of res.embeddings) out.push(normalize(e.values));
  }
  return out;
}

export async function generate(opts: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const res = await post<{
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  }>(`models/${CHAT_MODEL}:generateContent`, {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: { temperature: opts.temperature ?? 0.2, maxOutputTokens: 1500 },
  });
  const parts = res.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p) => p.text ?? "").join("").trim();
}
