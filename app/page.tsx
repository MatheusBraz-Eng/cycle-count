"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  LayoutDashboard,
  ScanLine,
  Settings,
  ShieldCheck,
  Upload,
  Warehouse,
  Users,
  RefreshCcw,
  FileCheck,
  Trash2,
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
type UserRole = "operator" | "cycle_count" | "ic" | "manager" | "admin";
type GLCountMode = "mop" | "linha";

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
  glMode?: GLCountMode;
  recountRequestedToIC?: boolean;
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

type RecountApproval = {
  id: string;
  location: string;
  pn: string;
  firstCounterBadge: string;
  recountBadge?: string;
  expectedQty: number;
  countedQty: number;
  comments?: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: string;
  sourceMode: CountMode;
};

type HrmCageRow = {
  pn: string;
  gaveta: string;
  quantidade: number;
};

type HrmCageCompareResult = {
  key: string;
  pn: string;
  gaveta: string;
  counted: number;
  saldoDac: number;
  difference: number;
  status: "ok" | "divergent";
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
  {
    id: "7",
    PN: "GL1001",
    Desc: "ITEM GL",
    Desc2: "ITEM GL",
    site: "BRH",
    warehouse: "DOI",
    location: "GL-01",
    qty: 42,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
  {
    id: "8",
    PN: "CAGE001",
    Desc: "ITEM HRM CAGE",
    Desc2: "ITEM HRM CAGE",
    site: "BRH",
    warehouse: "DOI",
    location: "HRM CAGE",
    qty: 60,
    bulkExpensed: "No",
    commodity: "Outros",
    countable: true,
  },
  {
    id: "9",
    PN: "SEG001",
    Desc: "ITEM SEGAS",
    Desc2: "ITEM SEGAS",
    site: "BRH",
    warehouse: "DOI",
    location: "SEGAS-01",
    qty: 25,
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
    mode: "blind",
    inputSource: "manual",
    user: "Bruno",
    badgeId: "BDG-2002",
    device: "desktop",
    startedAt: "2026-03-16T09:00:00",
    endedAt: "2026-03-16T09:05:00",
    divergence: "Erro de contagem",
    recountRequired: true,
    officialCount: false,
  },
];

const SAMPLE_APPROVALS: RecountApproval[] = [
  {
    id: "ra1",
    location: "SEGAS-01",
    pn: "SEG001",
    firstCounterBadge: "BDG-1001",
    recountBadge: "BDG-2002",
    expectedQty: 25,
    countedQty: 22,
    comments: "Solicitação mockada",
    status: "pending",
    requestedBy: "Operador 01",
    sourceMode: "blind",
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

function compareHrmCageData(
  countedRows: HrmCageRow[],
  saldoRows: HrmCageRow[],
): HrmCageCompareResult[] {
  const countedMap = new Map<string, number>();
  const saldoMap = new Map<string, number>();
  const keys = new Set<string>();

  countedRows.forEach((row) => {
    const key = `${row.pn}__${row.gaveta}`;
    countedMap.set(key, (countedMap.get(key) ?? 0) + Number(row.quantidade || 0));
    keys.add(key);
  });

  saldoRows.forEach((row) => {
    const key = `${row.pn}__${row.gaveta}`;
    saldoMap.set(key, (saldoMap.get(key) ?? 0) + Number(row.quantidade || 0));
    keys.add(key);
  });

  return Array.from(keys).map((key) => {
    const [pn, gaveta] = key.split("__");
    const counted = countedMap.get(key) ?? 0;
    const saldoDac = saldoMap.get(key) ?? 0;
    const difference = counted - saldoDac;

    return {
      key,
      pn,
      gaveta,
      counted,
      saldoDac,
      difference,
      status: difference === 0 ? "ok" : "divergent",
    };
  });
}

function exportCountsToCsv(entries: CountEntry[]) {
  const headers = [
    "location",
    "pn",
    "countedQty",
    "systemQty",
    "user",
    "badgeId",
    "divergence",
    "notes",
    "glMode",
    "recountRequired",
    "requestedToIC",
    "countMode",
    "endedAt",
  ];

  const rows = entries.map((entry) =>
    [
      entry.location,
      entry.pn,
      entry.countedQty,
      entry.systemQty ?? "",
      entry.user,
      entry.badgeId,
      entry.divergence,
      entry.notes ?? "",
      entry.glMode ?? "",
      entry.recountRequired ? "yes" : "no",
      entry.recountRequestedToIC ? "yes" : "no",
      entry.mode,
      entry.endedAt,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "cycle-count-export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function isGlLocation(location: string) {
  return location.trim().toUpperCase().startsWith("GL");
}

function isHrmCage(location: string) {
  return location.trim().toUpperCase() === "HRM CAGE";
}

function isSegas(location: string) {
  return location.trim().toUpperCase().includes("SEGAS");
}

function canSeePerformance(role: UserRole) {
  return role === "cycle_count" || role === "manager" || role === "admin";
}

function canSeeIc(role: UserRole) {
  return role === "cycle_count" || role === "ic" || role === "manager" || role === "admin";
}

function canApproveApproval(role: UserRole, sourceMode: CountMode) {
  if (role === "manager" || role === "admin" || role === "ic") return true;
  if (role === "cycle_count") return sourceMode === "open";
  return false;
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
  const [approvals, setApprovals] = useState<RecountApproval[]>(SAMPLE_APPROVALS);

  const [role, setRole] = useState<UserRole>("operator");
  const [excludedPNsText, setExcludedPNsText] = useState("VXH4V");
  const [officialCount, setOfficialCount] = useState(true);
  const [search, setSearch] = useState("");
  const [queueStatus, setQueueStatus] = useState("all");
  const [currentLocation, setCurrentLocation] = useState("LINE-01");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["LINE-01"]);
  const [countMode, setCountMode] = useState<CountMode>("blind");
  const [glMode, setGlMode] = useState<GLCountMode>("mop");
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

  const [countSaved, setCountSaved] = useState(false);
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [saldoDacFile, setSaldoDacFile] = useState<File | null>(null);
  const [manualRows, setManualRows] = useState<HrmCageRow[]>([{ pn: "", gaveta: "", quantidade: 0 }]);
  const [compareResults, setCompareResults] = useState<HrmCageCompareResult[]>([]);
  const [processingHrm, setProcessingHrm] = useState(false);

  const [recountComment, setRecountComment] = useState("");
  const [recountBadge, setRecountBadge] = useState("");
  const [selectedRecountId, setSelectedRecountId] = useState("");

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

  const currentIsGL = useMemo(() => isGlLocation(currentLocation), [currentLocation]);
  const currentIsHRM = useMemo(() => isHrmCage(currentLocation), [currentLocation]);
  const currentIsSEGAS = useMemo(() => isSegas(currentLocation), [currentLocation]);

  const canViewPerformance = canSeePerformance(role);
  const canViewIc = canSeeIc(role);
  const canSeeSettings = role === "admin";

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

  const selectedRecount = useMemo(
    () => entries.find((e) => e.id === selectedRecountId) || entries.find((e) => e.recountRequired),
    [entries, selectedRecountId]
  );

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

  function clearUploadState() {
    setInventory(SAMPLE_INVENTORY);
    setSelectedLocations(["LINE-01"]);
    setCurrentLocation("LINE-01");
    setInventoryFile(null);
    setSaldoDacFile(null);
    setManualRows([{ pn: "", gaveta: "", quantidade: 0 }]);
    setCompareResults([]);
    setMessage("Base e uploads limpos.");
  }

  function resetForm() {
    setFormPN("");
    setFormQty("");
    setFormPkgId("");
    setFormNotes("");
    setFormDivergence("Nenhuma");
    setRelatedLocation("");
    setCountSaved(false);
    setGlMode("mop");
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
    glMode?: GLCountMode;
    recountRequestedToIC?: boolean;
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
      glMode: params.glMode,
      recountRequestedToIC: params.recountRequestedToIC,
    };
  }

  async function handleCompareHrmCage() {
    if (!inventoryFile || !saldoDacFile) {
      setMessage("Anexe o arquivo principal e o arquivo Saldo DAC.");
      return;
    }

    try {
      setProcessingHrm(true);
      const mainRows = await parseExcelFile(inventoryFile);
      const saldoRows = await parseExcelFile(saldoDacFile);
      const mergedRows = [...mainRows, ...manualRows.filter((row) => row.pn && row.gaveta)];
      const results = compareHrmCageData(mergedRows, saldoRows);
      setCompareResults(results);
      setMessage(`Confronto HRM CAGE executado com ${results.length} linha(s).`);
    } catch {
      setMessage("Não foi possível processar os arquivos do HRM CAGE.");
    } finally {
      setProcessingHrm(false);
    }
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

    if (currentIsHRM && compareResults.length === 0) {
      return setMessage("Para HRM CAGE, execute primeiro o confronto com o Saldo DAC.");
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

    const requestIc = currentIsSEGAS && divergence !== "Nenhuma";

    const newEntry = createEntry({
      location: activeTask.location,
      pn: formPN.trim(),
      countedQty,
      mode: countMode,
      inputSource,
      relatedLocation: relatedLocation || undefined,
      divergence,
      notes: formNotes || undefined,
      glMode: currentIsGL ? glMode : undefined,
      recountRequestedToIC: requestIc,
    });

    setEntries((prev) => [newEntry, ...prev]);

    if (newEntry.recountRequired) {
      setApprovals((prev) => [
        {
          id: generateId(),
          location: newEntry.location,
          pn: newEntry.pn,
          firstCounterBadge: newEntry.badgeId,
          expectedQty: newEntry.systemQty ?? 0,
          countedQty: newEntry.countedQty,
          comments: newEntry.notes,
          status: "pending",
          requestedBy: newEntry.user,
          sourceMode: newEntry.mode,
        },
        ...prev,
      ]);
    }

    setCountSaved(true);
    setMessage(`Contagem registrada para ${newEntry.pn} em ${newEntry.location}.`);
    setFormPN("");
    setFormQty("");
    setFormPkgId("");
    setFormDivergence("Nenhuma");
    setRelatedLocation("");
  }

  function submitRecount() {
    if (!selectedRecount) {
      setMessage("Nenhum item de recontagem selecionado.");
      return;
    }

    if (!recountBadge.trim()) {
      setMessage("Informe o badge do recontador.");
      return;
    }

    setApprovals((prev) => {
      const alreadyExists = prev.some((item) => item.location === selectedRecount.location && item.pn === selectedRecount.pn);
      if (alreadyExists) {
        return prev.map((item) =>
          item.location === selectedRecount.location && item.pn === selectedRecount.pn
            ? { ...item, recountBadge, comments: recountComment || item.comments }
            : item
        );
      }

      return [
        {
          id: generateId(),
          location: selectedRecount.location,
          pn: selectedRecount.pn,
          firstCounterBadge: selectedRecount.badgeId,
          recountBadge,
          expectedQty: selectedRecount.systemQty ?? 0,
          countedQty: selectedRecount.countedQty,
          comments: recountComment,
          status: "pending",
          requestedBy: user,
          sourceMode: selectedRecount.mode,
        },
        ...prev,
      ];
    });

    setMessage(`Recontagem registrada para ${selectedRecount.pn}.`);
    setRecountComment("");
    setRecountBadge("");
  }

  function updateApprovalStatus(id: string, status: "approved" | "rejected") {
    const approval = approvals.find((item) => item.id === id);
    if (!approval) return;

    if (!canApproveApproval(role, approval.sourceMode)) {
      setMessage("Seu perfil não pode aprovar este tipo de recontagem.");
      return;
    }

    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setMessage(`Solicitação ${status === "approved" ? "aprovada" : "rejeitada"}.`);
  }

  const nav = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, visible: true },
    { key: "operators", label: "Operadores", icon: Users, visible: canViewPerformance },
    { key: "upload", label: "Upload Excel", icon: Upload, visible: true },
    { key: "queue", label: "Fila de contagem", icon: Warehouse, visible: true },
    { key: "count", label: "Contagem", icon: ScanLine, visible: true },
    { key: "recount", label: "Recontagem", icon: RefreshCcw, visible: true },
    { key: "ic", label: "IC / Aprovações", icon: FileCheck, visible: canViewIc },
    { key: "settings", label: "Administração", icon: Settings, visible: canSeeSettings },
  ];

  const visibleNav = nav.filter((item) => item.visible);

  React.useEffect(() => {
    if (!visibleNav.some((item) => item.key === page)) {
      setPage("dashboard");
    }
  }, [page, visibleNav]);

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
            <LabelText text="Perfil de acesso" />
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="operator">Operador</option>
              <option value="cycle_count">Cycle Count</option>
              <option value="ic">IC</option>
              <option value="manager">Gerente</option>
              <option value="admin">Admin</option>
            </select>
            <div className="small muted" style={{ marginTop: 8 }}>
              Dashboard liberado para todos.
            </div>
          </div>
        </div>

        <div className="card section-gap">
          <div className="card-body">
            <LabelText text="Rastreabilidade ativa" />
            <div className="small muted" style={{ marginTop: 8 }}>
              Registro por operador, badge, locação, tipo de contagem, GL e HRM CAGE.
            </div>
          </div>
        </div>

        <div className="section-gap">
          {visibleNav.map((item) => {
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
              Cycle Count só aprova recontagem com saldo. Recontagem cega segue sem essa aprovação.
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1 style={{ margin: "0 0 6px" }}>{nav.find((n) => n.key === page)?.label}</h1>
            <div className="muted">
              Operação, acurácia, divergências, desempenho e rastreabilidade em um único ambiente.
            </div>
          </div>

          <div className="topbar-badges">
            <span className="badge">Usuário: {user}</span>
            <span className="badge">Badge: {badgeId || "não informado"}</span>
            <span className="badge">Perfil: {role}</span>
            <span className="badge">Dispositivo: {device}</span>
            <span className="badge dark">Locação ativa: {activeTask?.location || "-"}</span>
          </div>
        </div>

        <div className="btn-row section-gap">
          <button className="btn" onClick={() => exportCountsToCsv(entries)}>
            <Download size={16} /> Exportar Excel
          </button>
          <button className="btn" onClick={clearUploadState}>
            <Trash2 size={16} /> Limpar upload
          </button>
          {canViewIc && (
            <button className="btn" onClick={() => setPage("ic")}>
              <ShieldCheck size={16} /> Abrir IC
            </button>
          )}
          {canViewPerformance && (
            <button className="btn" onClick={() => setPage("operators")}>
              <Users size={16} /> Abrir desempenho
            </button>
          )}
          <button className="btn dark" onClick={() => setPage("recount")}>
            <RefreshCcw size={16} /> Abrir recontagem
          </button>
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

        {page === "operators" && canViewPerformance && (
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

                {currentIsGL && (
                  <div className="card section-gap">
                    <div className="card-body">
                      <LabelText text="Regra GL" />
                      <select className="select" value={glMode} onChange={(e) => setGlMode(e.target.value as GLCountMode)}>
                        <option value="mop">Contagem MOP</option>
                        <option value="linha">Contagem linha</option>
                      </select>
                    </div>
                  </div>
                )}

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
                        <LabelText text="Comentários" />
                        <textarea className="textarea" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
                      </div>
                    </div>

                    {currentIsHRM && (
                      <div className="card section-gap">
                        <div className="card-header">
                          <h3 style={{ margin: 0 }}>HRM CAGE — Saldo DAC</h3>
                          <div className="muted small">Confronto por PN + gaveta + quantidade.</div>
                        </div>
                        <div className="card-body">
                          <div className="field-grid">
                            <div className="field">
                              <LabelText text="Arquivo principal" />
                              <input
                                className="file"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => setInventoryFile(e.target.files?.[0] || null)}
                              />
                            </div>
                            <div className="field">
                              <LabelText text="Arquivo Saldo DAC" />
                              <input
                                className="file"
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => setSaldoDacFile(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>

                          <div className="section-gap">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong>Gavetas manuais</strong>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => setManualRows((prev) => [...prev, { pn: "", gaveta: "", quantidade: 0 }])}
                              >
                                Adicionar gaveta
                              </button>
                            </div>

                            {manualRows.map((row, index) => (
                              <div key={index} className="field-grid section-gap">
                                <div className="field">
                                  <LabelText text="PN" />
                                  <input
                                    className="input"
                                    value={row.pn}
                                    onChange={(e) => {
                                      const next = [...manualRows];
                                      next[index].pn = e.target.value;
                                      setManualRows(next);
                                    }}
                                  />
                                </div>
                                <div className="field">
                                  <LabelText text="Gaveta" />
                                  <input
                                    className="input"
                                    value={row.gaveta}
                                    onChange={(e) => {
                                      const next = [...manualRows];
                                      next[index].gaveta = e.target.value;
                                      setManualRows(next);
                                    }}
                                  />
                                </div>
                                <div className="field">
                                  <LabelText text="Quantidade" />
                                  <input
                                    className="input"
                                    type="number"
                                    value={row.quantidade}
                                    onChange={(e) => {
                                      const next = [...manualRows];
                                      next[index].quantidade = Number(e.target.value);
                                      setManualRows(next);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}

                            <button className="btn dark" onClick={handleCompareHrmCage} disabled={processingHrm}>
                              {processingHrm ? "Processando..." : "Confrontar arquivos"}
                            </button>

                            {compareResults.length > 0 && (
                              <div className="table-wrap medium section-gap">
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>PN</th>
                                      <th>Gaveta</th>
                                      <th>Contado</th>
                                      <th>Saldo DAC</th>
                                      <th>Diferença</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compareResults.map((row) => (
                                      <tr key={row.key}>
                                        <td>{row.pn}</td>
                                        <td>{row.gaveta}</td>
                                        <td>{row.counted}</td>
                                        <td>{row.saldoDac}</td>
                                        <td>{row.difference}</td>
                                        <td>
                                          <span className={row.status === "ok" ? "badge success" : "badge danger"}>
                                            {row.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="btn-row section-gap">
                      <button className="btn dark" onClick={submitCount}>Finalizar contagem</button>
                      <button className="btn" onClick={resetForm}>Limpar</button>
                    </div>

                    {countSaved && (
                      <div className="card section-gap">
                        <div className="card-header">
                          <h3 style={{ margin: 0 }}>Próximos passos</h3>
                          <div className="muted small">Ações automáticas conforme a regra operacional.</div>
                        </div>
                        <div className="card-body">
                          <div className="btn-row">
                            {(countMode === "open" || currentIsHRM || compareResults.length > 0) && (
                              <button className="btn dark" onClick={() => setPage("recount")}>
                                Ir para recontagem
                              </button>
                            )}

                            {currentIsSEGAS && formDivergence !== "Nenhuma" && canViewIc && (
                              <button className="btn" onClick={() => setPage("ic")}>
                                Solicitar recontagem para IC
                              </button>
                            )}

                            <button className="btn" onClick={() => exportCountsToCsv(entries)}>
                              Exportar contagem para Excel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
                          <th>Comentário</th>
                          <th>Modo</th>
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
                              <td>{entry.notes || "-"}</td>
                              <td>{entry.mode === "open" ? "Com saldo" : "Cega"}</td>
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
          <div className="grid-2 section-gap">
            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Fila de recontagem</h3>
                <div className="muted small">Divergências pendentes com rastreabilidade por badge.</div>
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
                        <th>Modo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.filter((e) => e.recountRequired).map((entry) => (
                        <tr
                          key={entry.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedRecountId(entry.id)}
                        >
                          <td>{entry.location}</td>
                          <td>{entry.pn}</td>
                          <td>{entry.divergence}</td>
                          <td>{entry.user}</td>
                          <td>{entry.badgeId}</td>
                          <td>{entry.mode === "open" ? "Com saldo" : "Cega"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 style={{ margin: 0 }}>Registrar recontagem</h3>
                <div className="muted small">Comentário e badge dos contadores.</div>
              </div>
              <div className="card-body">
                <div className="field-grid">
                  <div className="field">
                    <LabelText text="Badge do primeiro contador" />
                    <input className="input" value={selectedRecount?.badgeId || ""} readOnly />
                  </div>
                  <div className="field">
                    <LabelText text="Badge da recontagem" />
                    <input className="input" value={recountBadge} onChange={(e) => setRecountBadge(e.target.value)} />
                  </div>
                  <div className="field">
                    <LabelText text="Comentário da recontagem" />
                    <textarea className="textarea" value={recountComment} onChange={(e) => setRecountComment(e.target.value)} />
                  </div>
                </div>

                <div className="btn-row section-gap">
                  <button className="btn dark" onClick={submitRecount}>Salvar recontagem</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "ic" && canViewIc && (
          <div className="card section-gap">
            <div className="card-header">
              <h3 style={{ margin: 0 }}>Aprovação de recontagem</h3>
              <div className="muted small">
                Cycle Count aprova apenas recontagem com saldo. IC, manager e admin aprovam todas.
              </div>
            </div>
            <div className="card-body">
              <div className="table-wrap tall">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Locação</th>
                      <th>PN</th>
                      <th>1º contador</th>
                      <th>Recontador</th>
                      <th>Esperado</th>
                      <th>Contado</th>
                      <th>Comentário</th>
                      <th>Modo</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((item) => {
                      const canApproveThis = canApproveApproval(role, item.sourceMode);

                      return (
                        <tr key={item.id}>
                          <td>{item.location}</td>
                          <td>{item.pn}</td>
                          <td>{item.firstCounterBadge}</td>
                          <td>{item.recountBadge || "-"}</td>
                          <td>{item.expectedQty}</td>
                          <td>{item.countedQty}</td>
                          <td>{item.comments || "-"}</td>
                          <td>{item.sourceMode === "open" ? "Com saldo" : "Cega"}</td>
                          <td>
                            <span className={
                              item.status === "approved"
                                ? "badge success"
                                : item.status === "rejected"
                                ? "badge danger"
                                : "badge warn"
                            }>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            {canApproveThis ? (
                              <div className="btn-row">
                                <button className="btn" onClick={() => updateApprovalStatus(item.id, "approved")}>
                                  Aprovar
                                </button>
                                <button className="btn" onClick={() => updateApprovalStatus(item.id, "rejected")}>
                                  Rejeitar
                                </button>
                              </div>
                            ) : (
                              <span className="badge neutral">Sem permissão</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {page === "settings" && canSeeSettings && (
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
                  • Dashboard visível para todos<br />
                  • Desempenho visível para Cycle Count, manager e admin<br />
                  • IC sem acesso ao desempenho<br />
                  • Cycle Count aprova só recontagem com saldo<br />
                  • IC, manager e admin aprovam todas<br />
                  • Rastreabilidade por badge, operador, locação e modo<br />
                  • Regra GL com MOP / linha<br />
                  • Regra HRM CAGE com Saldo DAC e gavetas<br />
                  • Exportação CSV e limpeza de upload
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

