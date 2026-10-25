import { chatJson } from "./llm";

type Macros = { calories: number; protein: number; carbs: number; fat: number };

export async function suggestRecipes(ingredients: string[], remaining: Macros) {
  const prompt = `You are a practical home-cooking assistant.
Ingredients available: ${ingredients.join(", ")}.
Macros the person still wants to hit today: ${remaining.calories} kcal, ${remaining.protein}g protein, ${remaining.carbs}g carbs, ${remaining.fat}g fat.

Suggest 3 different meals that mostly use the available ingredients and help close the gap.
Basic staples (salt, pepper, oil, water) are allowed. Anything else not on the list goes in "missing".
Macro numbers are rough estimates for one serving.
Return ONLY JSON in exactly this shape:
{"recipes":[{"title":"","time_minutes":0,"ingredients_used":[""],"missing":[""],"steps":[""],"estimated_macros":{"calories":0,"protein":0,"carbs":0,"fat":0},"why_it_fits":""}]}`;

  return chatJson([{ role: "user", content: prompt }]);
}
