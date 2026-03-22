"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  LayoutDashboard,
  ScanLine,
  Settings,
  ShieldCheck,
  Upload,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DivergenceType =
  | "Nenhuma"
  | "Erro de contagem"
  | "Sobra física"
  | "Divergência"
  | "Saldo em outra locação"
  | "Físico em outra locação";

type CountMode = "open" | "blind";
type InputSource = "scanner" | "manual";
type DeviceType = "desktop" | "coletor";
type QuickAction = "normal" | "saldo-outra" | "fisico-outra";

type InventoryRow = {
  id: string;
  PN: string;
  Desc?: string;
  Desc2?: string;
  site?: string;
  warehouse?: string;
  location: string;
  qty: number;
  bulkExpensed?: string;
  commodity: string;
  countable: boolean;
  issueCode?: string;
};

type CountEntry = {
  id: string;
  location: string;
  pn: string;
  countedQty: number;
  systemQty?: number;
  mode: CountMode;
  inputSource: InputSource;
  pkgId?: string;
  user: string;
  badgeId: string;
  device: DeviceType;
  startedAt: string;
  endedAt: string;
  divergence: DivergenceType;
  relatedLocation?: string;
  notes?: string;
  approvedBy?: string;
  recountRequired: boolean;
  officialCount: boolean;
  reconciliationId?: string;
};

type LocationTask = {
  location: string;
  totalPNs: number;
  totalQty: number;
  items: InventoryRow[];
  status: "Pendente" | "Em andamento" | "Concluída";
  activeCounters: number;
  commodityMix: string[];
};

const PIE_COLORS = ["#0f172a", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];

const SAMPLE_INVENTORY: InventoryRow[] = [
  {
    id: "1",
    PN: "VXH4V",
    Desc: "LBL,INFO,SYS,INT,L10,R550",
    Desc2: "LBL,INFO,SYS,INT,L10,R550",
    site: "BRH",
    warehouse: "DOI",
    location: "LABEL CAGE",
    qty: 337,
    bulkExpensed: "Yes",
    commodity: "Outros",
    countable: false,
    issueCode: "9",
  },
  {
    id: "2",
    PN: "MAT001",
    Desc: "NORMAL,COUNTABLE,ITEM",
    Desc2: "NORMAL,COUNTABLE,ITEM",
    site: "BRH",
    warehouse: "DOI",
    location: "LINE-01",
    qty: 120,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
  {
    id: "3",
    PN: "MAT002",
    Desc: "NORMAL,COUNTABLE,ITEM",
    Desc2: "NORMAL,COUNTABLE,ITEM",
    site: "BRH",
    warehouse: "DOI",
    location: "LINE-01",
    qty: 80,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
  {
    id: "4",
    PN: "MAT001",
    Desc: "NORMAL,COUNTABLE,ITEM",
    Desc2: "NORMAL,COUNTABLE,ITEM",
    site: "BRH",
    warehouse: "DOI",
    location: "LINE-06",
    qty: 35,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
  {
    id: "5",
    PN: "MAT003",
    Desc: "NORMAL,COUNTABLE,ITEM",
    Desc2: "NORMAL,COUNTABLE,ITEM",
    site: "BRH",
    warehouse: "DOI",
    location: "LINE-06",
    qty: 55,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
  {
    id: "6",
    PN: "MAT004",
    Desc: "NORMAL,COUNTABLE,ITEM",
    Desc2: "NORMAL,COUNTABLE,ITEM",
    site: "BRH",
    warehouse: "DOI",
    location: "LINE-09",
    qty: 30,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
];

const SAMPLE_ENTRIES: CountEntry[] = [
  {
    id: "ce1",
    location: "LINE-01",
    pn: "MAT001",
    countedQty: 50,
    systemQty: 120,
    mode: "open",
    inputSource: "scanner",
    pkgId: "PKG-0001-ABC",
    user: "Ana",
    badgeId: "BDG-1001",
    device: "coletor",
    startedAt: "2026-03-16T08:00:00",
    endedAt: "2026-03-16T08:03:00",
    divergence: "Nenhuma",
    notes: "Primeira parcial",
    recountRequired: false,
    officialCount: true,
  },
  {
    id: "ce2",
    location: "LINE-06",
    pn: "MAT003",
    countedQty: 55,
    systemQty: 55,
    mode: "open",
    inputSource: "manual",
    user: "Bruno",
    badgeId: "BDG-2002",
    device: "desktop",
    startedAt: "2026-03-16T09:00:00",
    endedAt: "2026-03-16T09:05:00",
    divergence: "Nenhuma",
    recountRequired: false,
    officialCount: false,
  },
];

function safeNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeString(v: unknown): string {
  return String(v ?? "").trim();
}

function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKey(key: string): string {
  return safeString(key).toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function inferCommodity(desc = "", desc2 = "", pn = ""): string {
  const text = `${desc} ${desc2} ${pn}`.toLowerCase();
  if (text.includes("cable")) return "Cabos";
  if (text.includes("sensor") || text.includes("connector")) return "Eletrônicos";
  if (text.includes("steel") || text.includes("bracket")) return "Mecânico";
  if (text.includes("abs") || text.includes("housing")) return "Plástico";
  return "Outros";
}

function secondsBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(1, Math.floor((e - s) / 1000));
}

function groupLocations(rows: InventoryRow[], entries: CountEntry[]): LocationTask[] {
  const grouped = new Map<string, InventoryRow[]>();

  rows
    .filter((r) => r.countable)
    .forEach((row) => {
      const bucket = grouped.get(row.location) || [];
      bucket.push(row);
      grouped.set(row.location, bucket);
    });

  return Array.from(grouped.entries()).map(([location, items]) => {
    const totalQty = items.reduce((sum, item) => sum + safeNumber(item.qty), 0);
    const locationEntries = entries.filter((e) => e.location === location);
    const countedPNs = new Set(locationEntries.map((e) => e.pn));
    const status: LocationTask["status"] =
      countedPNs.size === 0 ? "Pendente" : countedPNs.size >= items.length ? "Concluída" : "Em andamento";

    return {
      location,
      totalPNs: items.length,
      totalQty,
      items,
      status,
      activeCounters: Math.min(4, Math.max(0, new Set(locationEntries.map((e) => e.badgeId)).size)),
      commodityMix: Array.from(new Set(items.map((i) => i.commodity))),
    };
  });
}

function getPnProgressColor(
  expectedQty: number,
  countedTotal: number
): "gray" | "yellow" | "green" | "red" {
  if (countedTotal <= 0) return "gray";
  if (countedTotal === expectedQty) return "green";
  if (countedTotal > expectedQty) return "red";
  return "yellow";
}

function LabelText({ text }: { text: string }) {
  return <label className="small muted">{text}</label>;
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="small muted">{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn ${active ? "dark" : ""}`}
      onClick={onClick}
      style={{ marginRight: 8, marginBottom: 8 }}
    >
      {label}
    </button>
  );
}

export default function Page() {
  const [page, setPage] = useState("dashboard");
  const [inventory, setInventory] = useState<InventoryRow[]>(SAMPLE_INVENTORY);
  const [entries, setEntries] = useState<CountEntry[]>(SAMPLE_ENTRIES);
  const [excludedPNsText, setExcludedPNsText] = useState("VXH4V");
  const [officialCount, setOfficialCount] = useState(true);
  const [search, setSearch] = useState("");
  const [queueStatus, setQueueStatus] = useState("all");
  const [currentLocation, setCurrentLocation] = useState("LINE-01");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["LINE-01"]);
  const [countMode, setCountMode] = useState<CountMode>("blind");
  const [inputSource, setInputSource] = useState<InputSource>("scanner");
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [user, setUser] = useState("Operador 01");
  const [badgeId, setBadgeId] = useState("");
  const [formPN, setFormPN] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formPkgId, setFormPkgId] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formDivergence, setFormDivergence] = useState<DivergenceType>("Nenhuma");
  const [relatedLocation, setRelatedLocation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [quickCountMode, setQuickCountMode] = useState(false);
  const [quickCountPNs, setQuickCountPNs] = useState("MAT001");
  const [locationSelectionCount, setLocationSelectionCount] = useState("1");
  const [operatorFilter, setOperatorFilter] = useState("");

  const locations = useMemo(() => groupLocations(inventory, entries), [inventory, entries]);
  const availableLocations = useMemo(() => locations.map((l) => l.location), [locations]);
  const selectedLocationLimit = Math.max(1, safeNumber(locationSelectionCount || 1));
  const activeTask = useMemo(
    () => locations.find((l) => l.location === currentLocation) || locations[0],
    [locations, currentLocation]
  );
  const currentItems = activeTask?.items || [];
  const quickCountPnList = useMemo(
    () => quickCountPNs.split(/\n|,|;/).map((x) => x.trim()).filter(Boolean),
    [quickCountPNs]
  );

  function getPnCountedTotal(location: string, pn: string): number {
    return entries
      .filter((e) => e.location === location && e.pn === pn)
      .reduce((sum, entry) => sum + safeNumber(entry.countedQty), 0);
  }

  function getPnStatusClass(expectedQty: number, countedTotal: number) {
    const color = getPnProgressColor(expectedQty, countedTotal);
    if (color === "green") return { label: "Fechado", className: "badge success" };
    if (color === "yellow") return { label: "Parcial", className: "badge warn" };
    if (color === "red") return { label: "Acima do saldo", className: "badge danger" };
    return { label: "Pendente", className: "badge neutral" };
  }

  const metrics = useMemo(() => {
    const divergenceCounts = entries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.divergence] = (acc[entry.divergence] || 0) + 1;
      return acc;
    }, {});

    const timeByCommodity: Record<string, number[]> = {};
    entries.forEach((entry) => {
      const item = inventory.find((i) => i.location === entry.location && i.PN === entry.pn);
      const commodity = item?.commodity || "Outros";
      timeByCommodity[commodity] = timeByCommodity[commodity] || [];
      const seconds = secondsBetween(entry.startedAt, entry.endedAt);
      if (seconds > 0) timeByCommodity[commodity].push(seconds);
    });

    const commodityTimes = Object.entries(timeByCommodity).map(([commodity, arr]) => ({
      commodity,
      avgMinutes: Number((arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1) / 60).toFixed(2)),
    }));

    const total = Math.max(entries.length, 1);
    const accuracy = Math.max(0, (entries.filter((e) => e.divergence === "Nenhuma").length / total) * 100);
    const manualRate = (entries.filter((e) => e.inputSource === "manual").length / total) * 100;
    const recountRate = (entries.filter((e) => e.recountRequired).length / total) * 100;

    return {
      totalLocations: locations.length,
      openTasks: locations.filter((l) => l.status !== "Concluída").length,
      accuracy: `${accuracy.toFixed(1)}%`,
      manualRate: `${manualRate.toFixed(1)}%`,
      recountRate: `${recountRate.toFixed(1)}%`,
      divergenceChart: Object.entries(divergenceCounts).map(([name, value]) => ({ name, value })),
      commodityTimes,
    };
  }, [entries, inventory, locations]);

  const operatorMetrics = useMemo(() => {
    const map: Record<
      string,
      {
        badge: string;
        operator: string;
        totalQty: number;
        pnSet: Set<string>;
        divergences: number;
        times: number[];
        entries: CountEntry[];
      }
    > = {};

    entries.forEach((e) => {
      const key = e.badgeId || "UNKNOWN";
      if (!map[key]) {
        map[key] = {
          badge: key,
          operator: e.user || "-",
          totalQty: 0,
          pnSet: new Set(),
          divergences: 0,
          times: [],
          entries: [],
        };
      }

      map[key].totalQty += safeNumber(e.countedQty);
      map[key].pnSet.add(e.pn);
      if (e.divergence !== "Nenhuma") map[key].divergences += 1;

      const secs = secondsBetween(e.startedAt, e.endedAt);
      if (secs > 0) map[key].times.push(secs);

      map[key].entries.push(e);
    });

    return Object.values(map).map((o) => {
      const avgMinutes = o.times.length > 0 ? o.times.reduce((a, b) => a + b, 0) / o.times.length / 60 : 0;
      const totalEntries = Math.max(o.entries.length, 1);
      const accuracyRate = ((o.entries.length - o.divergences) / totalEntries) * 100;
      const speedScore = avgMinutes <= 3 ? 100 : avgMinutes >= 15 ? 40 : 100 - ((avgMinutes - 3) / 12) * 60;
      const volumeScore = Math.min(100, o.totalQty / 10);
      const score = Math.max(0, Math.min(100, accuracyRate * 0.5 + speedScore * 0.25 + volumeScore * 0.25));

      return {
        badge: o.badge,
        operator: o.operator,
        totalQty: o.totalQty,
        totalPNs: o.pnSet.size,
        divergences: o.divergences,
        avgTime: avgMinutes.toFixed(2),
        score: Number(score.toFixed(1)),
        entries: o.entries,
      };
    });
  }, [entries]);

  const topQuarterRanking = useMemo(() => {
    const currentQuarter =
      entries.length > 0
        ? `${new Date(entries[0].endedAt).getFullYear()}-Q${Math.floor(new Date(entries[0].endedAt).getMonth() / 3) + 1}`
        : "2026-Q1";

    return [...operatorMetrics]
      .map((op) => ({ ...op, period: currentQuarter }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [operatorMetrics, entries]);

  const topAnnualRanking = useMemo(() => {
    const currentYear = entries.length > 0 ? String(new Date(entries[0].endedAt).getFullYear()) : "2026";

    return [...operatorMetrics]
      .map((op) => ({ ...op, period: currentYear }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [operatorMetrics, entries]);

  const filteredOperatorMetrics = useMemo(() => {
    const term = operatorFilter.trim().toLowerCase();
    if (!term) return [...operatorMetrics].sort((a, b) => b.score - a.score);

    return [...operatorMetrics]
      .filter((op) => op.badge.toLowerCase().includes(term) || op.operator.toLowerCase().includes(term))
      .sort((a, b) => b.score - a.score);
  }, [operatorMetrics, operatorFilter]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch = [loc.location, ...loc.commodityMix].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = queueStatus === "all" ? true : loc.status === queueStatus;
      return matchesSearch && matchesStatus;
    });
  }, [locations, search, queueStatus]);

  function handleExcel(file: File) {
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

        let removedByIssue9 = 0;
        let removedByManualList = 0;
        const excludedPNs = excludedPNsText.split(/\n|,|;/).map((x) => x.trim()).filter(Boolean);

        const mapped = json
          .map((row, index) => {
            const map: Record<string, unknown> = {};
            Object.keys(row).forEach((key) => {
              map[normalizeKey(key)] = row[key];
            });

            const pn = safeString(map["itemnumber"] || map["pn"]);
            const desc = safeString(map["productname"] || map["desc"]);
            const desc2 = safeString(map["searchname"] || map["desc2"]);
            const site = safeString(map["site"]);
            const warehouse = safeString(map["warehouse"] || map["warehous"]);
            const location = safeString(map["location"]);
            const qty = safeNumber(map["physicalinventory"] || map["qty"]);
            const bulkExpensed = safeString(map["bulkexpensed1"] || map["bulkexpensed"]);

            if (!pn || !location) return null;

            const isIssueCode9 = bulkExpensed.toLowerCase() === "yes";
            const excludedManually = excludedPNs.includes(pn);
            if (isIssueCode9) removedByIssue9 += 1;
            if (!isIssueCode9 && excludedManually) removedByManualList += 1;

            return {
              id: `import-${index}-${pn}-${location}`,
              PN: pn,
              Desc: desc,
              Desc2: desc2,
              site,
              warehouse,
              location,
              qty,
              bulkExpensed,
              commodity: inferCommodity(desc, desc2, pn),
              countable: !isIssueCode9 && !excludedManually,
              issueCode: isIssueCode9 ? "9" : undefined,
            } as InventoryRow;
          })
          .filter(Boolean) as InventoryRow[];

        setInventory(mapped);
        const firstLocation = Array.from(new Set(mapped.filter((x) => x.countable).map((x) => x.location)))[0];
        if (firstLocation) {
          setCurrentLocation(firstLocation);
          setSelectedLocations([firstLocation]);
        }

        setMessage(
          `Importação concluída. ${mapped.length} linhas processadas. ${removedByIssue9} itens removidos por issue code 9 e ${removedByManualList} removidos pela lista manual.`
        );
        setPage("queue");
      } catch {
        setMessage("Falha ao processar o Excel.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function resetForm() {
    setFormPN("");
    setFormQty("");
    setFormPkgId("");
    setFormNotes("");
    setFormDivergence("Nenhuma");
    setRelatedLocation("");
  }

  function toggleLocationSelection(location: string) {
    setSelectedLocations((prev) => {
      const exists = prev.includes(location);
      if (exists) {
        const next = prev.filter((item) => item !== location);
        return next.length > 0 ? next : prev;
      }

      if (prev.length >= selectedLocationLimit) {
        setMessage(`Você pode selecionar até ${selectedLocationLimit} locação(ões).`);
        return prev;
      }

      return [...prev, location];
    });
  }

  function createEntry(params: {
    location: string;
    pn: string;
    countedQty: number;
    mode: CountMode;
    inputSource: InputSource;
    relatedLocation?: string;
    divergence: DivergenceType;
    notes?: string;
  }): CountEntry {
    const matchedItem = inventory.find(
      (item) => item.countable && item.location === params.location && item.PN.toLowerCase() === params.pn.toLowerCase()
    );

    return {
      id: generateId(),
      location: params.location,
      pn: params.pn,
      countedQty: params.countedQty,
      systemQty: matchedItem?.qty,
      mode: params.mode,
      inputSource: params.inputSource,
      pkgId: formPkgId || undefined,
      user,
      badgeId,
      device,
      startedAt: new Date(Date.now() - 1000 * 30).toISOString(),
      endedAt: new Date().toISOString(),
      divergence: params.divergence,
      relatedLocation: params.relatedLocation,
      notes: params.notes,
      recountRequired: params.divergence !== "Nenhuma",
      officialCount,
      approvedBy: params.divergence !== "Nenhuma" ? undefined : officialCount ? "Time IC" : "Materiais",
    };
  }

  function submitCount() {
    if (!badgeId.trim()) return setMessage("Informe o Badge do operador para iniciar a contagem.");
    if (!activeTask) return setMessage("Selecione uma locação válida.");
    if (!formPN.trim() || !formQty.trim()) return setMessage("PN e QTY são obrigatórios.");

    const matchedItem = currentItems.find((item) => item.PN.toLowerCase() === formPN.trim().toLowerCase());
    const needsLocation =
      formDivergence === "Saldo em outra locação" || formDivergence === "Físico em outra locação";

    if (needsLocation && !relatedLocation.trim()) return setMessage("Informe a locação relacionada.");
    if (!matchedItem && formDivergence === "Nenhuma") {
      return setMessage("PN não pertence à locação selecionada.");
    }

    const countedQty = safeNumber(formQty);
    const divergence: DivergenceType = !matchedItem
      ? formDivergence === "Nenhuma"
        ? "Divergência"
        : formDivergence
      : countedQty === matchedItem.qty && formDivergence === "Nenhuma"
      ? "Nenhuma"
      : formDivergence === "Nenhuma"
      ? "Erro de contagem"
      : formDivergence;

    const newEntry = createEntry({
      location: activeTask.location,
      pn: formPN.trim(),
      countedQty,
      mode: countMode,
      inputSource,
      relatedLocation: relatedLocation || undefined,
      divergence,
      notes: formNotes || undefined,
    });

    setEntries((prev) => [newEntry, ...prev]);
    setMessage(`Contagem registrada para ${newEntry.pn} em ${newEntry.location}.`);
    resetForm();
  }

  const nav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "operators", label: "Operadores", icon: Activity },
    { key: "upload", label: "Upload Excel", icon: Upload },
    { key: "queue", label: "Fila de contagem", icon: Warehouse },
    { key: "count", label: "Contagem", icon: ScanLine },
    { key: "recount", label: "Recontagem", icon: ShieldCheck },
    { key: "settings", label: "Administração", icon: Settings },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-box">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <h2 style={{ margin: "0 0 4px" }}>Cycle Count Enginei</h2>
            <div className="muted small">Portal corporativo de contagem</div>
          </div>
        </div>

        <div className="card section-gap">
          <div className="card-body">
            <div className="small muted">Ambiente</div>
            <div className="section-gap small">
              <div>
                Portal <span className="badge" style={{ float: "right" }}>SharePoint</span>
              </div>
              <div style={{ marginTop: 8 }}>
                Aplicação <span className="badge" style={{ float: "right" }}>Vercel</span>
              </div>
              <div style={{ marginTop: 8 }}>
                Usuários <span className="badge" style={{ float: "right" }}>40</span>
              </div>
              <div style={{ marginTop: 8 }}>
                Mesma locação <span className="badge" style={{ float: "right" }}>até 4</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section-gap">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-btn ${page === item.key ? "active" : ""}`}
                onClick={() => setPage(item.key)}
              >
                <Icon size={16} /> {item.label}
              </button>
            );
          })}
        </div>

        <div className="card section-gap">
          <div className="card-body">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <LabelText text="Contagem oficial" />
              <input
                type="checkbox"
                checked={officialCount}
                onChange={(e) => setOfficialCount(e.target.checked)}
              />
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>
              Oficial aprova com time IC. Interna aprova com materiais.
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 style={{ margin: "0 0 6px" }}>{nav.find((n) => n.key === page)?.label}</h1>
            <div className="muted">
              Operação, acurácia, divergências e performance em um único ambiente.
            </div>
          </div>

          <div className="topbar-badges">
            <span className="badge">Usuário: {user}</span>
            <span className="badge">Badge: {badgeId || "não informado"}</span>
            <span className="badge">Dispositivo: {device}</span>
            <span className="badge dark">Locação ativa: {activeTask?.location || "-"}</span>
          </div>
        </div>

        {message && (
          <div className="notice">
            <AlertTriangle size={16} style={{ verticalAlign: "text-bottom", marginRight: 8 }} />
            {message}
          </div>
        )}

        {page === "dashboard" && (
          <div className="section-gap">
            <div className="grid-5">
              <div className="card"><div className="kpi"><div><div className="muted small">Locações</div><h3>{metrics.totalLocations}</h3><div className="muted small">Base preparada e contável</div></div><Warehouse /></div></div>
              <div className="card"><div className="kpi"><div><div className="muted small">Pendências</div><h3>{metrics.openTasks}</h3><div className="muted small">Locações ainda em aberto</div></div><Clock3 /></div></div>
              <div className="card"><div className="kpi"><div><div className="muted small">Acurácia</div><h3>{metrics.accuracy}</h3><div className="muted small">Primeira contagem</div></div><CheckCircle2 /></div></div>
              <div className="card"><div className="kpi"><div><div className="muted small">Entrada manual</div><h3>{metrics.manualRate}</h3><div className="muted small">Participação manual</div></div><Activity /></div></div>
              <div className="card"><div className="kpi"><div><div className="muted small">Recontagem</div><h3>{metrics.recountRate}</h3><div className="muted small">Itens exigindo nova análise</div></div><ShieldCheck /></div></div>
            </div>

            <div className="grid-2 section-gap">
              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Tempo médio por commodity</h3>
                  <div className="muted small">Baseado no histórico das contagens.</div>
                </div>
                <div className="card-body" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.commodityTimes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="commodity" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgMinutes" fill="#0f172a" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Divergências</h3>
                  <div className="muted small">Distribuição das classificações registradas.</div>
                </div>
                <div className="card-body" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.divergenceChart}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                      >
                        {metrics.divergenceChart.map((entry, idx) => (
                          <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "operators" && (
          <div className="section-gap">
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Top 5 contadores — Quarter</h3>
                  <div className="muted small">Ranking do quarter atual.</div>
                </div>
                <div className="card-body">
                  <div className="table-wrap medium">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Badge</th>
                          <th>Operador</th>
                          <th>Score</th>
                          <th>Período</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topQuarterRanking.map((row, idx) => (
                          <tr key={row.badge}>
                            <td>{idx + 1}</td>
                            <td>{row.badge}</td>
                            <td>{row.operator}</td>
                            <td>{row.score}</td>
                            <td>{row.period}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Top 5 contadores — Anual</h3>
                  <div className="muted small">Ranking anual atual.</div>
                </div>
                <div className="card-body">
                  <div className="table-wrap medium">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Badge</th>
                          <th>Operador</th>
                          <th>Score</th>
                          <th>Período</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topAnnualRanking.map((row, idx) => (
                          <tr key={row.badge}>
                            <td>{idx + 1}</td>
                            <td>{row.badge}</td>
                            <td>{row.operator}</td>
                            <td>{row.score}</td>
                            <td>{row.period}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="card section-gap">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Gestão por operador</h3>
                <div className="muted small">Volume, qualidade, tempo médio e reconciliações por badge.</div>
              </div>
              <div className="card-body">
                <div style={{ maxWidth: 320, marginBottom: 12 }}>
                  <input
                    className="input"
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    placeholder="Filtrar por operador ou badge"
                  />
                </div>

                <div className="table-wrap tall">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Badge</th>
                        <th>Operador</th>
                        <th>Total contado</th>
                        <th>PNs contados</th>
                        <th>Divergências</th>
                        <th>Tempo médio (min)</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOperatorMetrics.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="muted">Nenhum operador encontrado.</td>
                        </tr>
                      ) : (
                        filteredOperatorMetrics.map((op) => (
                          <tr key={op.badge}>
                            <td>{op.badge}</td>
                            <td>{op.operator}</td>
                            <td>{op.totalQty}</td>
                            <td>{op.totalPNs}</td>
                            <td>{op.divergences}</td>
                            <td>{op.avgTime}</td>
                            <td>{op.score}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "upload" && (
          <div className="grid-2 section-gap">
            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Importação da base Excel</h3>
                <div className="muted small">Layout: Item_Number, Product_Name, Search_Name, Site, Warehouse, Location, Physical_Inventory, Bulk_Expensed1.</div>
              </div>
              <div className="card-body">
                <input
                  className="file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files?.[0] && handleExcel(e.target.files[0])}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Prévia da base atual</h3>
                <div className="muted small">Itens prontos após aplicação das regras.</div>
              </div>
              <div className="card-body">
                <div className="table-wrap medium">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>PN</th>
                        <th>Location</th>
                        <th>Qty</th>
                        <th>Issue 9</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.slice(0, 20).map((row) => (
                        <tr key={row.id}>
                          <td>{row.PN}</td>
                          <td>{row.location}</td>
                          <td>{row.qty}</td>
                          <td>{row.issueCode === "9" ? "Sim" : "Não"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "queue" && (
          <div className="section-gap">
            <div className="card">
              <div className="card-body">
                <div className="field-grid">
                  <div className="field">
                    <LabelText text="Buscar" />
                    <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por location ou commodity" />
                  </div>
                  <div className="field">
                    <LabelText text="Status" />
                    <select className="select" value={queueStatus} onChange={(e) => setQueueStatus(e.target.value)}>
                      <option value="all">Todos</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card section-gap">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Seleção rápida de locações</h3>
              </div>
              <div className="card-body">
                <div className="field-grid">
                  <div className="field">
                    <LabelText text="Quantidade de locações" />
                    <select className="select" value={locationSelectionCount} onChange={(e) => setLocationSelectionCount(e.target.value)}>
                      {["1", "2", "3", "4", "5"].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <LabelText text="Locações selecionadas" />
                    <div className="location-chip-row">
                      {availableLocations.map((location) => (
                        <ToggleChip
                          key={location}
                          label={location}
                          active={selectedLocations.includes(location)}
                          onClick={() => toggleLocationSelection(location)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-2 section-gap">
              {filteredLocations.map((loc) => (
                <div key={loc.location} className="card">
                  <div className="card-body">
                    <div className="topbar">
                      <div>
                        <h3 style={{ margin: "0 0 6px" }}>{loc.location}</h3>
                        <div className="muted small">Agrupamento apenas por location</div>
                      </div>
                      <div className="btn-row">
                        <button className="btn" onClick={() => toggleLocationSelection(loc.location)}>
                          Selecionar
                        </button>
                        <button
                          className="btn dark"
                          onClick={() => {
                            setCurrentLocation(loc.location);
                            if (!selectedLocations.includes(loc.location)) {
                              setSelectedLocations((prev) => [
                                ...prev.slice(0, selectedLocationLimit - 1),
                                loc.location,
                              ]);
                            }
                            setPage("count");
                          }}
                        >
                          Abrir contagem
                        </button>
                      </div>
                    </div>

                    <div className="grid-2 section-gap">
                      <MiniInfo label="PNs" value={String(loc.totalPNs)} />
                      <MiniInfo label="Qty total" value={String(loc.totalQty)} />
                      <MiniInfo label="Operadores" value={`${loc.activeCounters}/4`} />
                      <MiniInfo label="A contar" value={`${loc.totalPNs} PNs`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === "count" && (
          <div className="grid-main section-gap">
            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Configuração da sessão</h3>
                <div className="muted small">Badge obrigatório, leitura via coletor e digitação manual habilitadas na mesma contagem.</div>
              </div>

              <div className="card-body">
                <div className="field-grid section-gap">
                  <div className="field">
                    <LabelText text="Badge do operador" />
                    <input className="input" value={badgeId} onChange={(e) => setBadgeId(e.target.value)} placeholder="Obrigatório para iniciar" />
                  </div>
                  <div className="field">
                    <LabelText text="Locação ativa" />
                    <select className="select" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)}>
                      {selectedLocations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <LabelText text="Usuário" />
                    <input className="input" value={user} onChange={(e) => setUser(e.target.value)} />
                  </div>
                  <div className="field">
                    <LabelText text="Modo de contagem" />
                    <select className="select" value={countMode} onChange={(e) => setCountMode(e.target.value as CountMode)}>
                      <option value="blind">Cega</option>
                      <option value="open">Com saldo</option>
                    </select>
                  </div>
                  <div className="field">
                    <LabelText text="Dispositivo" />
                    <select className="select" value={device} onChange={(e) => setDevice(e.target.value as DeviceType)}>
                      <option value="desktop">Desktop</option>
                      <option value="coletor">Coletor</option>
                    </select>
                  </div>
                  <div className="field">
                    <LabelText text="Origem da entrada" />
                    <select className="select" value={inputSource} onChange={(e) => setInputSource(e.target.value as InputSource)}>
                      <option value="scanner">Scanner / coletor</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>

                <div className="card section-gap">
                  <div className="card-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <div><strong>Ação rápida multi-locação</strong></div>
                        <div className="muted small">Conte 1 PN ou mais em todas as locações selecionadas.</div>
                      </div>
                      <input type="checkbox" checked={quickCountMode} onChange={(e) => setQuickCountMode(e.target.checked)} />
                    </div>

                    {quickCountMode && (
                      <div className="section-gap">
                        <div className="field">
                          <LabelText text="PNs foco da ação rápida" />
                          <textarea className="textarea" value={quickCountPNs} onChange={(e) => setQuickCountPNs(e.target.value)} />
                        </div>
                        <div className="field">
                          <LabelText text="Locações consideradas" />
                          <div className="location-chip-row">
                            {selectedLocations.map((loc) => (
                              <span key={loc} className="badge">{loc}</span>
                            ))}
                          </div>
                        </div>
                        <div className="small muted">PNs informados: {quickCountPnList.join(", ") || "-"}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card section-gap">
                  <div className="card-body">
                    <div className="field-grid">
                      <div className="field">
                        <LabelText text="PKG ID" />
                        <input className="input" value={formPkgId} onChange={(e) => setFormPkgId(e.target.value)} />
                      </div>
                      <div className="field">
                        <LabelText text="PN" />
                        <input className="input" value={formPN} onChange={(e) => setFormPN(e.target.value)} />
                      </div>
                      <div className="field">
                        <LabelText text="QTY" />
                        <input className="input" type="number" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
                      </div>
                      <div className="field">
                        <LabelText text="Divergência" />
                        <select className="select" value={formDivergence} onChange={(e) => setFormDivergence(e.target.value as DivergenceType)}>
                          {[
                            "Nenhuma",
                            "Erro de contagem",
                            "Sobra física",
                            "Divergência",
                            "Saldo em outra locação",
                            "Físico em outra locação",
                          ].map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <LabelText text="Locação relacionada" />
                        <input className="input" value={relatedLocation} onChange={(e) => setRelatedLocation(e.target.value)} />
                      </div>
                      <div className="field">
                        <LabelText text="Observação" />
                        <textarea className="textarea" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                      </div>
                    </div>

                    <div className="btn-row section-gap">
                      <button className="btn dark" onClick={submitCount}>Registrar contagem</button>
                      <button className="btn" onClick={resetForm}>Limpar</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {quickCountMode && (
                <div className="card">
                  <div className="card-header">
                    <h3 style={{ margin: 0 }}>Visão consolidada da ação rápida</h3>
                    <div className="muted small">Conferência dos PNs foco nas locações selecionadas.</div>
                  </div>
                  <div className="card-body">
                    <div className="table-wrap tall">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Locação</th>
                            <th>PN</th>
                            {countMode === "open" && <th>Saldo</th>}
                            <th>Físico somado</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedLocations.flatMap((location) =>
                            inventory
                              .filter(
                                (item) =>
                                  item.countable &&
                                  item.location === location &&
                                  (quickCountPnList.length === 0 || quickCountPnList.includes(item.PN))
                              )
                              .map((item) => {
                                const countedTotal = getPnCountedTotal(location, item.PN);
                                const status = getPnStatusClass(item.qty, countedTotal);
                                return (
                                  <tr key={`${location}-${item.PN}`}>
                                    <td>{location}</td>
                                    <td>{item.PN}</td>
                                    {countMode === "open" && <td>{item.qty}</td>}
                                    <td>{countedTotal}</td>
                                    <td><span className={status.className}>{status.label}</span></td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="card section-gap">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Locações selecionadas</h3>
                  <div className="muted small">Navegue entre as locações escolhidas.</div>
                </div>
                <div className="card-body">
                  <div className="location-chip-row">
                    {selectedLocations.map((loc) => (
                      <ToggleChip
                        key={loc}
                        label={loc}
                        active={currentLocation === loc}
                        onClick={() => setCurrentLocation(loc)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="card section-gap">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Locação ativa: {activeTask?.location || "-"}</h3>
                  <div className="muted small">Semáforo por PN com soma progressiva.</div>
                </div>
                <div className="card-body">
                  <div className="table-wrap medium">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>PN</th>
                          <th>Descrição</th>
                          {countMode === "open" && <th>Saldo</th>}
                          <th>Somado</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((item) => {
                          const countedTotal = getPnCountedTotal(currentLocation, item.PN);
                          const status = getPnStatusClass(item.qty, countedTotal);

                          return (
                            <tr key={item.id}>
                              <td>{item.PN}</td>
                              <td>{item.Desc || item.Desc2 || "-"}</td>
                              {countMode === "open" && <td>{item.qty}</td>}
                              <td>{countedTotal}</td>
                              <td><span className={status.className}>{status.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card section-gap">
                <div className="card-header">
                  <h3 style={{ margin: 0 }}>Últimos lançamentos</h3>
                  <div className="muted small">Histórico individual por badge e operador.</div>
                </div>
                <div className="card-body">
                  <div className="table-wrap short">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>PN</th>
                          <th>QTY</th>
                          <th>Badge</th>
                          <th>Operador</th>
                          <th>Divergência</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries
                          .filter((e) => e.location === currentLocation)
                          .slice(0, 20)
                          .map((entry) => (
                            <tr key={entry.id}>
                              <td>{entry.pn}</td>
                              <td>{entry.countedQty}</td>
                              <td>{entry.badgeId}</td>
                              <td>{entry.user}</td>
                              <td>{entry.divergence}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "recount" && (
          <div className="card section-gap">
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Fila de recontagem</h3>
              <div className="muted small">Divergências pendentes de aprovação oficial ou interna.</div>
            </div>
            <div className="card-body">
              <div className="table-wrap medium">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Locação</th>
                      <th>PN</th>
                      <th>Tipo</th>
                      <th>Responsável</th>
                      <th>Badge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.filter((e) => e.recountRequired).map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.location}</td>
                        <td>{entry.pn}</td>
                        <td>{entry.divergence}</td>
                        <td>{entry.user}</td>
                        <td>{entry.badgeId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {page === "settings" && (
          <div className="grid-2 section-gap">
            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Administração de exclusões</h3>
                <div className="muted small">Lista editável de PNs não contáveis.</div>
              </div>
              <div className="card-body">
                <textarea
                  className="textarea"
                  value={excludedPNsText}
                  onChange={(e) => setExcludedPNsText(e.target.value)}
                />
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Resumo técnico</h3>
                <div className="muted small">Pacote preparado para deploy.</div>
              </div>
              <div className="card-body">
                <div className="small muted">
                  • Badge obrigatório para iniciar e registrar<br />
                  • Rastreabilidade por operador e por badge<br />
                  • Múltiplos operadores no mesmo PN/location com histórico individual<br />
                  • Top 5 por quarter e anual<br />
                  • Filtro por operador/badge<br />
                  • Blindagem contra dados inválidos
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

