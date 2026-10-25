import { chatJson } from "./llm";

const PROMPT = `You are looking at a photo of a fridge, pantry, or groceries.
List every food ingredient you can identify.
Return ONLY JSON in exactly this shape:
{"ingredients":[{"name":"string","quantity_estimate":"string","confidence":"high|medium|low"}]}
Mark anything you are unsure about as "low" confidence. Do not guess brands.`;

export async function analyzeFridgePhoto(base64: string, mimeType: string) {
  return chatJson([
    {
      role: "user",
      content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    },
  ]);
}
