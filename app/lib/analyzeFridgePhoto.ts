import { GoogleGenAI } from "@google/genai";

// Check AI Studio for a Flash model available on the free tier and swap the id here if needed
const MODEL = "gemini-flash-latest";

const PROMPT = `You are looking at a photo of a fridge, pantry, or groceries.
List every food ingredient you can identify.
Return ONLY JSON in exactly this shape:
{"ingredients":[{"name":"string","quantity_estimate":"string","confidence":"high|medium|low"}]}
Mark anything you are unsure about as "low" confidence. Do not guess brands.`;

export async function analyzeFridgePhoto(base64: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType, data: base64 } }, { text: PROMPT }],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  return JSON.parse(response.text ?? "{}");
}

