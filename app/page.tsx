"use client";
/* eslint-disable @next/next/no-img-element */
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

const fields: { key: keyof Macros; label: string; unit: string; color: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal", color: "#f97316" },
  { key: "protein", label: "Protein", unit: "g", color: "#e11d48" },
  { key: "carbs", label: "Carbs", unit: "g", color: "#f59e0b" },
  { key: "fat", label: "Fat", unit: "g", color: "#0ea5e9" },
];

const EMOJI: [string, string][] = [
  ["egg", "🥚"], ["milk", "🥛"], ["kefir", "🥛"], ["yogurt", "🥣"], ["cheese", "🧀"],
  ["chicken", "🍗"], ["meat", "🥩"], ["beef", "🥩"], ["fish", "🐟"], ["salmon", "🐟"],
  ["carrot", "🥕"], ["cucumber", "🥒"], ["pepper", "🫑"], ["onion", "🧅"], ["tomato", "🍅"],
  ["lettuce", "🥬"], ["greens", "🥬"], ["spinach", "🥬"], ["celery", "🥬"],
  ["cauliflower", "🥦"], ["broccoli", "🥦"], ["apple", "🍎"], ["flatbread", "🫓"],
  ["bread", "🍞"], ["pasta", "🍝"], ["rice", "🍚"], ["butter", "🧈"], ["juice", "🧃"],
  ["bar", "🍫"], ["salsa", "🍅"], ["sauce", "🍅"],
];

function emojiFor(name: string) {
  const n = name.toLowerCase();
  const hit = EMOJI.find(([k]) => n.includes(k));
  return hit ? hit[1] : "🍽️";
}

function Ring({
  color, target, eaten,
}: { color: string; target: number; eaten: number }) {
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const pct = target > 0 ? Math.min(eaten / target, 1) : 0;
  const left = Math.max(target - eaten, 0);
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold">{left}</span>
        <span className="text-[10px] text-slate-500">left</span>
      </div>
    </div>
  );
}

function GapBar({
  label, value, remaining, color, unit,
}: { label: string; value: number; remaining: number; color: string; unit: string }) {
  const pct = remaining > 0 ? Math.min(Math.round((value / remaining) * 100), 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{value}{unit} · fills {pct}% of gap</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
        {n}
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );
}

const card = "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100";

export default function Home() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [newItem, setNewItem] = useState("");
  const [preview, setPreview] = useState("");
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
    setPreview(URL.createObjectURL(file));
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
    setRecipes([]);
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
      setError("Could not get recipes. Check the terminal for details.");
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
    <div
      className="min-h-screen text-slate-800"
      style={{ backgroundImage: "linear-gradient(to bottom, #ecfdf5, #ffffff 45%, #fffbeb)" }}
    >
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-3xl shadow-lg">
            🥗
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Fridge Coach</h1>
          <p className="mt-2 text-slate-500">Snap your fridge. Fill your macro gap. Cook something good.</p>
        </header>

        <section className={card}>
          <StepTitle n={1} title="Your day so far" />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col items-center">
                <Ring color={f.color} target={target[f.key]} eaten={eaten[f.key]} />
                <p className="mt-1 text-sm font-semibold">{f.label}</p>
                <p className="text-xs text-slate-500">{eaten[f.key]} / {target[f.key]} {f.unit}</p>
                <div className="mt-2 flex w-full gap-1">
                  <input
                    type="number" aria-label={`${f.label} target`} title="Daily target"
                    className="w-1/2 rounded-lg border border-slate-200 p-1 text-center text-sm"
                    value={target[f.key]}
                    onChange={(e) => setNum(setTarget, f.key, e.target.value)}
                  />
                  <input
                    type="number" aria-label={`${f.label} eaten`} title="Eaten so far"
                    className="w-1/2 rounded-lg border border-slate-200 p-1 text-center text-sm"
                    value={eaten[f.key]}
                    onChange={(e) => setNum(setEaten, f.key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            Left box = your daily target, right box = eaten so far. All values are estimates.
          </p>
        </section>

        <section className={card}>
          <StepTitle n={2} title="Your fridge" />
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-6 text-center transition hover:bg-emerald-50">
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {preview ? (
              <img src={preview} alt="Your fridge" className="max-h-56 rounded-xl object-cover shadow" />
            ) : (
              <span className="text-5xl">📸</span>
            )}
            <span className="font-medium text-emerald-700">
              {preview ? "Tap to choose a different photo" : "Tap to upload a photo of your fridge"}
            </span>
          </label>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-3 text-slate-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              Looking through your fridge...
            </div>
          )}
          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {items.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {items.map((it, i) => (
                <span
                  key={i}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ring-1 ${
                    it.confidence === "low"
                      ? "bg-amber-50 text-amber-800 ring-amber-200"
                      : "bg-slate-50 text-slate-700 ring-slate-200"
                  }`}
                  title={it.confidence === "low" ? "Low confidence, double-check" : it.quantity_estimate}
                >
                  <span>{emojiFor(it.name)}</span>
                  {it.name}
                  <button
                    className="ml-1 text-slate-400 hover:text-red-600"
                    aria-label={`Remove ${it.name}`}
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Add something the photo missed"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
            />
            <button className="rounded-xl bg-slate-900 px-4 text-sm font-medium text-white" onClick={addItem}>
              Add
            </button>
          </div>
        </section>

        <section className={card}>
          <StepTitle n={3} title="What to cook" />
          <button
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
            disabled={items.length === 0 || cooking}
            onClick={getRecipes}
          >
            {cooking ? "Cooking up ideas..." : "🍳 Suggest recipes for my gap"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">Macro numbers are rough AI estimates, not exact.</p>

          {cooking && (
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          )}

          <div className="mt-5 space-y-5">
            {recipes.map((r, i) => {
              const m = r.estimated_macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
              return (
                <article key={i} className="rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold">{r.title}</h3>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      ⏱ {r.time_minutes} min
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{r.why_it_fits}</p>

                  <div className="mt-4 space-y-2">
                    <GapBar label="Protein" value={m.protein} remaining={remaining.protein} color="#e11d48" unit="g" />
                    <GapBar label="Carbs" value={m.carbs} remaining={remaining.carbs} color="#f59e0b" unit="g" />
                    <GapBar label="Fat" value={m.fat} remaining={remaining.fat} color="#0ea5e9" unit="g" />
                    <GapBar label="Calories" value={m.calories} remaining={remaining.calories} color="#f97316" unit=" kcal" />
                  </div>

                  {(r.missing ?? []).length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-amber-700">You would need:</span>
                      {(r.missing ?? []).map((x, j) => (
                        <span key={j} className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{x}</span>
                      ))}
                    </div>
                  )}

                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-emerald-700">Show steps</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                      {(r.steps ?? []).map((s, j) => (
                        <li key={j}>{s}</li>
                      ))}
                    </ol>
                  </details>
                </article>
              );
            })}
          </div>
        </section>

        <footer className="pb-6 text-center text-xs text-slate-400">
          Built with Next.js and AI. Nutrition values are estimates, not medical advice.
        </footer>
      </main>
    </div>
  );
}