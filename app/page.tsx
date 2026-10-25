"use client";
import { useState } from "react";
import { Anton, DM_Sans } from "next/font/google";

const display = Anton({ subsets: ["latin"], weight: "400" });
const body = DM_Sans({ subsets: ["latin"] });

type Macros = { calories: number; protein: number; carbs: number; fat: number };
type Info = Macros & { basis: string; source: string; matched?: string };
type Ingredient = {
  name: string;
  quantity_estimate: string;
  confidence: string;
  info?: Info;
  note?: string;
};
type Recipe = {
  title: string;
  time_minutes: number;
  ingredients_used: string[];
  missing: string[];
  steps: string[];
  estimated_macros: Macros;
  why_it_fits: string;
};

const fields: { key: keyof Macros; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: " kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
];

// All colors live here. Swap in the exact hex codes from Canva to match your design.
const palette = {
  "--bg": "#6c0010",
  "--panel": "#511119",
  "--ink": "#ffe0e2",
  "--muted": "rgba(255,224,226,0.6)",
  "--line": "rgba(255,224,226,0.18)",
  "--track": "rgba(255,224,226,0.14)",
  "--ghost": "#5c000c",
} as React.CSSProperties;

const ui = {
  panel: "rounded-sm bg-[color:var(--panel)] p-6",
  column: "min-h-[30rem]",
  heading: "mb-6 text-center text-sm uppercase tracking-wide",
  label: "text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]",
  input:
    "w-full border-b border-[color:var(--line)] bg-transparent py-1 text-sm text-[color:var(--ink)] outline-none placeholder:text-[color:var(--muted)] focus:border-[color:var(--ink)]",
  nameInput:
    "min-w-0 flex-1 border-b border-transparent bg-transparent py-1 text-sm text-[color:var(--ink)] outline-none hover:border-[color:var(--line)] focus:border-[color:var(--ink)]",
  btn: "bg-[color:var(--ink)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--bg)] transition hover:opacity-85 disabled:opacity-40",
  ghost:
    "border border-[color:var(--line)] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] transition hover:border-[color:var(--ink)] disabled:opacity-40",
};

function Meter({ pct, segments = 20 }: { pct: number; segments?: number }) {
  const filled = Math.round((Math.min(Math.max(pct, 0), 100) / 100) * segments);
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 flex-1 rounded-[2px]"
          style={{ backgroundColor: i < filled ? "var(--ink)" : "var(--track)" }}
        />
      ))}
    </div>
  );
}

function GapRow({
  label, value, remaining, unit,
}: { label: string; value: number; remaining: number; unit: string }) {
  const pct = remaining > 0 ? Math.round((value / remaining) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] uppercase tracking-[0.12em] text-[color:var(--muted)]">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}
          {unit} · {pct}% of gap
        </span>
      </div>
      <div className="mt-1.5">
        <Meter pct={pct} segments={16} />
      </div>
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [newItem, setNewItem] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
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

  function update(i: number, patch: Partial<Ingredient>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }

  function rename(i: number, name: string) {
    update(i, { name, info: undefined, note: "" });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
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

  async function lookup(i: number) {
    const name = items[i]?.name.trim();
    if (!name) return;
    setBusy(i);
    update(i, { note: "" });
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      update(i, { info: data });
    } catch {
      update(i, { note: "Lookup failed. Check the terminal for details." });
    }
    setBusy(null);
  }

  async function getRecipes() {
    setCooking(true);
    setError("");
    setRecipes([]);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: items.map((i) => ({ name: i.name, info: i.info })),
          remaining,
        }),
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
      style={palette}
      className={`${body.className} min-h-screen bg-[color:var(--bg)] text-[color:var(--ink)]`}
    >
      <header className="relative overflow-hidden px-6 pb-10 pt-10 sm:px-10">
        <span
          aria-hidden
          className={`${display.className} pointer-events-none absolute -right-6 bottom-0 select-none text-[clamp(8rem,30vw,26rem)] uppercase leading-[0.8] text-[color:var(--ghost)]`}
        >
          Track
        </span>
        <div className="relative inline-block">
          <h1
            className={`${display.className} text-[clamp(5rem,17vw,12rem)] uppercase leading-[0.84] text-[color:var(--ink)]`}
          >
            Fridge
            <br />
            Coach
          </h1>
          <p className="mt-2 text-right text-xs font-semibold uppercase leading-tight tracking-wide">
            Made by Aryan Patel
          </p>
        </div>
      </header>

      <main className="space-y-4 px-4 pb-12 sm:px-8">
        <section className={ui.panel}>
          <h2 className={ui.heading}>Your day · set your targets, log what you have eaten</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {fields.map((f) => (
              <div key={f.key}>
                <div className="flex items-baseline justify-between">
                  <span className={ui.label}>{f.label}</span>
                  <span className="text-sm tabular-nums">
                    {remaining[f.key]}
                    {f.unit} left
                  </span>
                </div>
                <div className="mt-2">
                  <Meter pct={target[f.key] ? (eaten[f.key] / target[f.key]) * 100 : 0} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className={ui.label}>Target</span>
                    <input
                      type="number"
                      className={ui.input}
                      value={target[f.key]}
                      onChange={(e) => setNum(setTarget, f.key, e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className={ui.label}>Eaten</span>
                    <input
                      type="number"
                      className={ui.input}
                      value={eaten[f.key]}
                      onChange={(e) => setNum(setEaten, f.key, e.target.value)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className={`${ui.panel} ${ui.column}`}>
            <h2 className={ui.heading}>Add a photo of your fridge</h2>
            <label className="flex h-48 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-[color:var(--line)] text-center transition hover:border-[color:var(--ink)]">
              <span className="text-xs uppercase tracking-[0.18em]">
                {fileName ? "Choose a different photo" : "Tap to choose a photo"}
              </span>
              {fileName && (
                <span className="break-all px-4 text-xs text-[color:var(--muted)]">{fileName}</span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
            {loading && <p className="mt-4 text-sm text-[color:var(--muted)]">Reading your photo...</p>}
            {error && <p className="mt-4 text-sm text-[#ffb4bc]">{error}</p>}
          </section>

          <section className={`${ui.panel} ${ui.column}`}>
            <h2 className={ui.heading}>Ingredients (press to change)</h2>
            {items.length === 0 && (
              <p className="text-center text-sm text-[color:var(--muted)]">Upload a photo to fill this list.</p>
            )}
            {items.length > 0 && (
              <p className="mb-2 text-xs text-[color:var(--muted)]">
                Edit a name to what it really is (a specific brand, for example), then press Look up to fill in its macros.
              </p>
            )}
            <ul className="max-h-[32rem] overflow-y-auto">
              {items.map((it, i) => (
                <li key={i} className="border-b border-[color:var(--line)] py-3">
                  <div className="flex items-center gap-2">
                    <input
                      className={ui.nameInput}
                      aria-label="Ingredient name"
                      value={it.name}
                      onChange={(e) => rename(i, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && lookup(i)}
                    />
                    <button className={ui.ghost} disabled={busy === i} onClick={() => lookup(i)}>
                      {busy === i ? "..." : it.info ? "Refresh" : "Look up"}
                    </button>
                    <button
                      className="px-1 text-lg leading-none text-[color:var(--muted)] hover:text-[color:var(--ink)]"
                      aria-label={`Remove ${it.name}`}
                      onClick={() => setItems(items.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-[color:var(--muted)]">
                    {it.quantity_estimate}
                    {it.confidence === "low" && " · check this name"}
                  </p>
                  {it.info && (
                    <div className="mt-1">
                      <p className="text-xs tabular-nums">
                        {it.info.calories} kcal · {it.info.protein}g protein · {it.info.carbs}g carbs · {it.info.fat}g fat
                      </p>
                      <p className="text-[11px] text-[color:var(--muted)]">
                        {it.info.basis} · {it.info.source}
                        {it.info.matched ? ` · matched: ${it.info.matched}` : ""}
                      </p>
                    </div>
                  )}
                  {it.note && <p className="mt-1 text-xs text-[#ffb4bc]">{it.note}</p>}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-end gap-2">
              <input
                className={ui.input}
                placeholder="Add something the photo missed"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
              />
              <button className={ui.ghost} onClick={addItem}>
                Add
              </button>
            </div>
          </section>

          <section className={`${ui.panel} ${ui.column}`}>
            <h2 className={ui.heading}>Suggested recipes</h2>
            <button className={`${ui.btn} w-full`} disabled={items.length === 0 || cooking} onClick={getRecipes}>
              {cooking ? "Thinking..." : "Suggest recipes for my gap"}
            </button>
            <p className="mt-2 text-center text-[11px] text-[color:var(--muted)]">
              Recipe macros are rough estimates, not exact.
            </p>
            <div className="mt-5 space-y-4">
              {recipes.map((r, i) => {
                const m = r.estimated_macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
                return (
                  <article key={i} className="border border-[color:var(--line)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={`${display.className} text-2xl uppercase leading-none tracking-wide`}>
                        {r.title}
                      </h3>
                      <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                        {r.time_minutes} min
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{r.why_it_fits}</p>
                    <div className="mt-4 space-y-3">
                      <GapRow label="Protein" value={m.protein} remaining={remaining.protein} unit="g" />
                      <GapRow label="Carbs" value={m.carbs} remaining={remaining.carbs} unit="g" />
                      <GapRow label="Fat" value={m.fat} remaining={remaining.fat} unit="g" />
                      <GapRow label="Calories" value={m.calories} remaining={remaining.calories} unit=" kcal" />
                    </div>
                    {(r.missing ?? []).length > 0 && (
                      <p className="mt-4 text-xs text-[color:var(--muted)]">
                        You would need: {(r.missing ?? []).join(", ")}
                      </p>
                    )}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] uppercase tracking-[0.14em]">Steps</summary>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
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
        </div>

        <footer className="pt-4 text-center text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted)]">
          Nutrition values are estimates, not medical advice
        </footer>
      </main>
    </div>
  );
}