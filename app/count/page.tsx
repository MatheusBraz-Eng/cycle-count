"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { compareHrmCageData, isGlLocation, isHrmCage } from "../../lib/utils";
import type { HrmCageCompareResult, HrmCageRow } from "../../types";

function normalizeHeader(value: string) {
  return value
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function extractRowsFromSheet(json: Record<string, unknown>[]): HrmCageRow[] {
  return json
    .map((row) => {
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]),
      );

      const pn = String(
        normalized.PN ??
          normalized.PART_NUMBER ??
          normalized.ITEM ??
          normalized.SKU ??
          "",
      ).trim();

      const gaveta = String(
        normalized.GAVETA ??
          normalized.LOCACAO ??
          normalized.LOCATION ??
          normalized.BIN ??
          "",
      ).trim();

      const quantidade = Number(
        normalized.QUANTIDADE ??
          normalized.QTY ??
          normalized.QUANTITY ??
          normalized.SALDO ??
          0,
      );

      return { pn, gaveta, quantidade };
    })
    .filter((row) => row.pn && row.gaveta);
}

async function parseExcelFile(file: File): Promise<HrmCageRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  return extractRowsFromSheet(json);
}

export default function CountPage() {
  const [form, setForm] = useState({
    location: "",
    pn: "",
    quantity: "",
    counterBadge: "",
    comments: "",
    countMode: "mop",
  });

  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [saldoDacFile, setSaldoDacFile] = useState<File | null>(null);
  const [manualRows, setManualRows] = useState<HrmCageRow[]>([
    { pn: "", gaveta: "", quantidade: 0 },
  ]);
  const [compareResults, setCompareResults] = useState<HrmCageCompareResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saved, setSaved] = useState(false);

  const glRule = useMemo(() => isGlLocation(form.location), [form.location]);
  const hrmRule = useMemo(() => isHrmCage(form.location), [form.location]);
  const segasRule = useMemo(
    () => form.location.trim().toUpperCase().includes("SEGAS"),
    [form.location],
  );
  const hasSaldoFlow = useMemo(
    () => hrmRule || compareResults.length > 0,
    [hrmRule, compareResults.length],
  );

  function resetAll() {
    setForm({
      location: "",
      pn: "",
      quantity: "",
      counterBadge: "",
      comments: "",
      countMode: "mop",
    });
    setInventoryFile(null);
    setSaldoDacFile(null);
    setManualRows([{ pn: "", gaveta: "", quantidade: 0 }]);
    setCompareResults([]);
    setSaved(false);
  }

  async function handleCompareHrmCage() {
    if (!inventoryFile || !saldoDacFile) {
      alert("Anexe o arquivo principal e o arquivo Saldo DAC.");
      return;
    }

    try {
      setProcessing(true);

      const mainRows = await parseExcelFile(inventoryFile);
      const saldoRows = await parseExcelFile(saldoDacFile);

      const mergedCountedRows = [...mainRows, ...manualRows.filter((row) => row.pn && row.gaveta)];
      const results = compareHrmCageData(mergedCountedRows, saldoRows);
      setCompareResults(results);
    } catch (error) {
      console.error(error);
      alert("Não foi possível processar os arquivos Excel.");
    } finally {
      setProcessing(false);
    }
  }

  function handleSaveCount() {
    setSaved(true);
    alert("Contagem mockada registrada com sucesso.");
  }

  return (
    <main className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Contagem</h1>
          <p className="text-gray-600">
            Registro da contagem com regras de operação e próximos passos.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href="/api/export"
            className="rounded-xl bg-slate-900 px-4 py-2 text-white"
          >
            Exportar contagem
          </a>

          <button
            onClick={resetAll}
            className="rounded-xl border px-4 py-2"
          >
            Limpar upload
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-2xl border p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span>Locação</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={form.location}
                onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Ex.: GL-01, HRM CAGE ou SEGAS"
              />
            </label>

            <label className="grid gap-2">
              <span>Badge do contador</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={form.counterBadge}
                onChange={(e) => setForm((prev) => ({ ...prev, counterBadge: e.target.value }))}
                placeholder="Ex.: OP-001"
              />
            </label>

            <label className="grid gap-2">
              <span>PN</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={form.pn}
                onChange={(e) => setForm((prev) => ({ ...prev, pn: e.target.value }))}
              />
            </label>

            <label className="grid gap-2">
              <span>Quantidade</span>
              <input
                type="number"
                className="rounded-xl border px-3 py-2"
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </label>
          </div>

          {glRule && (
            <label className="mt-4 grid gap-2">
              <span>Modo da contagem (GL)</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={form.countMode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    countMode: e.target.value as "mop" | "linha",
                  }))
                }
              >
                <option value="mop">Contagem MOP</option>
                <option value="linha">Contagem linha</option>
              </select>
            </label>
          )}

          <label className="mt-4 grid gap-2">
            <span>Comentários</span>
            <textarea
              className="min-h-28 rounded-xl border px-3 py-2"
              value={form.comments}
              onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
              placeholder="Observações da contagem"
            />
          </label>

          {hrmRule && (
            <div className="mt-6 rounded-2xl border border-dashed p-4">
              <h2 className="text-xl font-semibold">Regra especial - HRM CAGE</h2>
              <p className="mb-4 text-sm text-gray-600">
                Anexe o arquivo principal, o Saldo DAC e registre manualmente as gavetas contadas.
                O sistema confronta PN + gaveta + quantidade.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span>Arquivo principal</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="rounded-xl border px-3 py-2"
                    onChange={(e) => setInventoryFile(e.target.files?.[0] || null)}
                  />
                </label>

                <label className="grid gap-2">
                  <span>Arquivo Saldo DAC</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="rounded-xl border px-3 py-2"
                    onChange={(e) => setSaldoDacFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="mt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Gavetas contadas manualmente</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setManualRows((prev) => [...prev, { pn: "", gaveta: "", quantidade: 0 }])
                    }
                    className="rounded-xl border px-3 py-2"
                  >
                    Adicionar gaveta
                  </button>
                </div>

                <div className="grid gap-3">
                  {manualRows.map((row, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-3">
                      <input
                        className="rounded-xl border px-3 py-2"
                        placeholder="PN"
                        value={row.pn}
                        onChange={(e) => {
                          const next = [...manualRows];
                          next[index].pn = e.target.value;
                          setManualRows(next);
                        }}
                      />
                      <input
                        className="rounded-xl border px-3 py-2"
                        placeholder="Gaveta"
                        value={row.gaveta}
                        onChange={(e) => {
                          const next = [...manualRows];
                          next[index].gaveta = e.target.value;
                          setManualRows(next);
                        }}
                      />
                      <input
                        type="number"
                        className="rounded-xl border px-3 py-2"
                        placeholder="Quantidade"
                        value={row.quantidade}
                        onChange={(e) => {
                          const next = [...manualRows];
                          next[index].quantidade = Number(e.target.value);
                          setManualRows(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompareHrmCage}
                disabled={processing}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {processing ? "Processando..." : "Confrontar arquivos"}
              </button>

              {compareResults.length > 0 && (
                <div className="mt-6 overflow-x-auto rounded-2xl border">
                  <table className="min-w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3">PN</th>
                        <th className="px-4 py-3">Gaveta</th>
                        <th className="px-4 py-3">Contado</th>
                        <th className="px-4 py-3">Saldo DAC</th>
                        <th className="px-4 py-3">Diferença</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareResults.map((item) => (
                        <tr key={item.key} className="border-t">
                          <td className="px-4 py-3">{item.pn}</td>
                          <td className="px-4 py-3">{item.gaveta}</td>
                          <td className="px-4 py-3">{item.counted}</td>
                          <td className="px-4 py-3">{item.saldoDac}</td>
                          <td className="px-4 py-3">{item.difference}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-sm ${
                                item.status === "ok"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <button
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-white"
            onClick={handleSaveCount}
          >
            Finalizar contagem
          </button>

          {saved && (
            <div className="mt-6 rounded-2xl border bg-slate-50 p-4">
              <h2 className="text-xl font-semibold">Próximos passos</h2>
              <p className="mt-2 text-sm text-gray-600">
                A contagem foi registrada. Escolha a próxima ação conforme a regra operacional.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {hasSaldoFlow && (
                  <a
                    href="/recount?as=operator"
                    className="rounded-xl bg-amber-500 px-4 py-2 text-white"
                  >
                    Ir para recontagem
                  </a>
                )}

                {segasRule && (
                  <a
                    href="/ic?as=ic"
                    className="rounded-xl bg-red-600 px-4 py-2 text-white"
                  >
                    Solicitar recontagem para IC
                  </a>
                )}

                <a
                  href="/api/export"
                  className="rounded-xl border px-4 py-2"
                >
                  Exportar contagem para Excel
                </a>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-2xl border p-6">
          <h2 className="text-xl font-semibold">Regras aplicadas</h2>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li>Locações que começam com GL habilitam MOP ou linha.</li>
            <li>Locação HRM CAGE habilita upload do arquivo principal e do Saldo DAC.</li>
            <li>Também libera cadastro manual de gavetas e quantidades.</li>
            <li>O confronto considera PN + gaveta + quantidade.</li>
            <li>Após finalizar, o sistema exibe os próximos passos.</li>
            <li>SEGAS pode solicitar recontagem para IC.</li>
            <li>Fluxos com saldo liberam a ida para recontagem.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

