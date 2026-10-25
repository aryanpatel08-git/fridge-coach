"use client";
import { useState } from "react";

type Ingredient = { name: string; quantity_estimate: string; confidence: string };
type Macros = { calories: number; protein: number; carbs: number; fat: number };
type Recipe = {
  title: string;
  time_minutes: number;
  ingredients_used: string[];
  missing: string[];
  steps: string[];
  estimated_macros: Macros;
  why_it_fits: string;
};

const fields: { key: keyof Macros; label: string }[] = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein (g)" },
  { key: "carbs", label: "Carbs (g)" },
  { key: "fat", label: "Fat (g)" },
];

export default function Home() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [error, setError] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [target, setTarget] = useState<Macros>({ calories: 2200, protein: 150, carbs: 250, fat: 70 });
  const [eaten, setEaten] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  const remaining: Macros = {
    calories: Math.max(target.calories - eaten.calories, 0),
    protein: Math.max(target.protein - eaten.protein, 0),
    carbs: Math.max(target.carbs - eaten.carbs, 0),
    fat: Math.max(target.fat - eaten.fat, 0),
  };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.ingredients ?? []);
    } catch {
      setError("Something went wrong reading the photo. Check the terminal for details.");
    }
    setLoading(false);
  }

  async function getRecipes() {
    setCooking(true);
    setError("");
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: items.map((i) => i.name), remaining }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecipes(data.recipes ?? []);
    } catch {
      setError("Couldn't get recipes. Check the terminal for details.");
    }
    setCooking(false);
  }

  function addItem() {
    if (!newItem.trim()) return;
    setItems([...items, { name: newItem.trim(), quantity_estimate: "added by you", confidence: "high" }]);
    setNewItem("");
  }

  function setNum(setter: typeof setTarget, key: keyof Macros, value: string) {
    setter((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  }

  return (
    <main className="mx-auto max-w-xl space-y-8 p-8">
      <h1 className="text-3xl font-bold">Fridge Coach</h1>

      <section>
        <h2 className="mb-2 text-xl font-semibold">1. Your day so far</h2>
        <p className="mb-2 text-sm text-gray-500">
          Set your own daily targets and what you&apos;ve eaten. Values are estimates.
        </p>
        <div className="grid grid-cols-3 gap-2 text-sm font-medium">
          <span></span>
          <span>Target</span>
          <span>Eaten</span>
          {fields.map((f) => (
            <div key={f.key} className="contents">
              <label>{f.label}</label>
              <input
                type="number"
                className="rounded border p-1"
                value={target[f.key]}
                onChange={(e) => setNum(setTarget, f.key, e.target.value)}
              />
              <input
                type="number"
                className="rounded border p-1"
                value={eaten[f.key]}
                onChange={(e) => setNum(setEaten, f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded bg-green-50 p-3 text-green-900">
          <p className="font-semibold">Still to go today:</p>
          <p>{fields.map((f) => `${f.label}: ${remaining[f.key]}`).join("  |  ")}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">2. Your fridge</h2>
        <input type="file" accept="image/*" onChange={handleUpload} />
        {loading && <p className="mt-4">Looking at your fridge...</p>}
        {error && <p className="mt-4 text-red-600">{error}</p>}
        <ul className="mt-4 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between rounded border p-2">
              <span>
                {it.name} <span className="text-gray-500">({it.quantity_estimate})</span>
                {it.confidence === "low" && <span className="ml-2 text-orange-600">double-check</span>}
              </span>
              <button className="text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 rounded border p-1"
            placeholder="Add a missing ingredient"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button className="rounded bg-black px-3 text-white" onClick={addItem}>
            Add
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">3. What to cook</h2>
        <button
          className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
          disabled={items.length === 0 || cooking}
          onClick={getRecipes}
        >
          {cooking ? "Thinking..." : "Suggest recipes"}
        </button>
        <p className="mt-2 text-xs text-gray-500">Macro numbers are rough estimates, not exact.</p>
        <div className="mt-4 space-y-4">
          {recipes.map((r, i) => (
            <div key={i} className="rounded border p-4">
              <h3 className="text-lg font-semibold">
                {r.title} <span className="text-sm font-normal text-gray-500">({r.time_minutes} min)</span>
              </h3>
              <p className="text-sm text-green-800">{r.why_it_fits}</p>
              <p className="mt-1 text-sm">
                ~{r.estimated_macros.calories} kcal | {r.estimated_macros.protein}g protein |{" "}
                {r.estimated_macros.carbs}g carbs | {r.estimated_macros.fat}g fat
              </p>
              {r.missing.length > 0 && (
                <p className="mt-1 text-sm text-orange-700">You&apos;d need: {r.missing.join(", ")}</p>
              )}
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                {r.steps.map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}