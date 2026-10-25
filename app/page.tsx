"use client";
import { useState } from "react";

type Ingredient = { name: string; quantity_estimate: string; confidence: string };

export default function Home() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("Something went wrong. Check the terminal for details.");
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-3xl font-bold">Fridge Coach</h1>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {loading && <p className="mt-4">Looking at your fridge...</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}
      <ul className="mt-6 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="rounded border p-2">
            {it.name} <span className="text-gray-500">({it.quantity_estimate})</span>
            {it.confidence === "low" && <span className="ml-2 text-orange-600">double-check</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}