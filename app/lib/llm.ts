const MODEL = "qwen/qwen3.8-27b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// The only file that knows which AI provider we use.
export async function chatJson(messages: unknown[]) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model reply");
  return JSON.parse(text.slice(start, end + 1));
}
