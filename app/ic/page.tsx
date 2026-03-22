"use client";

import { useState } from "react";
import { getMockUser } from "../../lib/auth";
import { canAccess } from "../../lib/roles";
import { mockRecounts } from "../../lib/utils";

type IcContentProps = {
  roleAs?: string;
};

function IcContent({ roleAs }: IcContentProps) {
  const user = getMockUser(roleAs);
  const [items, setItems] = useState(mockRecounts);

  if (!canAccess(user.role, "/ic")) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">Acesso negado</h1>
        <p className="mt-2 text-gray-600">
          Esta tela é restrita ao time de IC, manager ou admin.
        </p>
      </main>
    );
  }

  function updateStatus(id: string, status: "approved" | "rejected") {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  return (
    <main className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Aprovação de recontagem - IC</h1>
        <p className="text-gray-600">
          Usuário mockado: {user.name} | badge {user.badgeId} | perfil {user.role}
        </p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  {item.location} - {item.pn}
                </h2>
                <p className="text-sm text-gray-600">
                  1ª contagem: {item.firstCounterBadge} | Recontagem: {item.recountBadge || "não informado"}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">
                Status: {item.status}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-gray-500">Esperado</p>
                <p className="text-2xl font-bold">{item.expectedQty}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-gray-500">Contado</p>
                <p className="text-2xl font-bold">{item.countedQty}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-gray-500">Diferença</p>
                <p className="text-2xl font-bold">{item.countedQty - item.expectedQty}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm">
              <strong>Comentário:</strong> {item.comments || "Sem comentário"}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => updateStatus(item.id, "approved")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
              >
                Aprovar
              </button>
              <button
                onClick={() => updateStatus(item.id, "rejected")}
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

type IcPageProps = {
  searchParams?: Promise<{ as?: string }>;
};

export default async function IcPage({ searchParams }: IcPageProps) {
  const params = (await searchParams) ?? {};
  return <IcContent roleAs={params.as} />;
}

