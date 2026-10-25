import { suggestRecipes } from "../../lib/suggestRecipes";

export async function POST(req: Request) {
  try {
    const { ingredients, remaining } = await req.json();
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return Response.json({ error: "No ingredients" }, { status: 400 });
    }
    const result = await suggestRecipes(ingredients, remaining);
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Recipe suggestion failed" }, { status: 500 });
  }
}
