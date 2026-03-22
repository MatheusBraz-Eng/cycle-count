"use client";

import { useState } from "react";
import { mockRecounts } from "../../lib/utils";

export default function RecountPage() {
  const [form, setForm] = useState({
    requestId: mockRecounts[0]?.id || "",
    recountBadge: "",
    firstCounterBadge: mockRecounts[0]?.firstCounterBadge || "",
    comment: "",
  });

  const selected = mockRecounts.find((item) => item.id === form.requestId);

  return (
    <main className="p-8">
      <h1 className="mb-6 text-3xl font-bold">Recontagem</h1>

      <div className="max-w-3xl rounded-2xl border p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span>Solicitação</span>
            <select
              className="rounded-xl border px-3 py-2"
              value={form.requestId}
              onChange={(e) => {
                const next = mockRecounts.find((item) => item.id === e.target.value);
                setForm((prev) => ({
                  ...prev,
                  requestId: e.target.value,
                  firstCounterBadge: next?.firstCounterBadge || "",
                }));
              }}
            >
              {mockRecounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.location} - {item.pn}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span>Badge da recontagem</span>
            <input
              className="rounded-xl border px-3 py-2"
              value={form.recountBadge}
              onChange={(e) => setForm((prev) => ({ ...prev, recountBadge: e.target.value }))}
              placeholder="Ex.: OP-008"
            />
          </label>

          <label className="grid gap-2">
            <span>Badge do primeiro contador</span>
            <input
              className="rounded-xl border bg-slate-100 px-3 py-2"
              value={form.firstCounterBadge}
              readOnly
            />
          </label>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-sm text-gray-500">Divergência atual</p>
            <p className="text-2xl font-bold">
              {selected ? selected.countedQty - selected.expectedQty : 0}
            </p>
          </div>
        </div>

        <label className="mt-4 grid gap-2">
          <span>Comentário da recontagem</span>
          <textarea
            className="min-h-28 rounded-xl border px-3 py-2"
            value={form.comment}
            onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Descreva o que foi encontrado na recontagem"
          />
        </label>

        <button
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-white"
          onClick={() => alert("Recontagem mockada registrada com sucesso.")}
        >
          Salvar recontagem
        </button>
      </div>
    </main>
  );
}
