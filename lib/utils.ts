import type {
  CountRecord,
  HrmCageCompareResult,
  HrmCageRow,
  OperatorPerformance,
  RecountRequest,
  UploadRecord,
} from "../types";

export const mockUploads: UploadRecord[] = [
  {
    id: "up-1",
    fileName: "inventory_line01.xlsx",
    uploadType: "inventory",
    uploadedBy: "OP-001",
    createdAt: new Date().toISOString(),
  },
  {
    id: "up-2",
    fileName: "saldo_dac_hrm_cage.xlsx",
    uploadType: "saldo_dac",
    uploadedBy: "OP-001",
    createdAt: new Date().toISOString(),
  },
];

export const mockCounts: CountRecord[] = [
  {
    id: "c-1",
    location: "LINE-01",
    pn: "PN-1001",
    quantity: 120,
    counterBadge: "OP-001",
    comments: "Contagem sem intercorrência",
    status: "counted",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c-2",
    location: "GL-04",
    pn: "PN-2001",
    quantity: 88,
    counterBadge: "OP-002",
    comments: "Contagem manual por linha",
    countMode: "linha",
    status: "divergent",
    createdAt: new Date().toISOString(),
  },
  {
    id: "c-3",
    location: "HRM CAGE",
    pn: "PN-5009",
    quantity: 40,
    counterBadge: "OP-003",
    comments: "Aguardando validação DAC",
    status: "divergent",
    createdAt: new Date().toISOString(),
  },
];

export const mockRecounts: RecountRequest[] = [
  {
    id: "r-1",
    location: "GL-04",
    pn: "PN-2001",
    expectedQty: 90,
    countedQty: 88,
    firstCounterBadge: "OP-002",
    recountBadge: "OP-008",
    comments: "Diferença encontrada na primeira contagem.",
    status: "pending",
  },
  {
    id: "r-2",
    location: "HRM CAGE",
    pn: "PN-5009",
    expectedQty: 42,
    countedQty: 40,
    firstCounterBadge: "OP-003",
    recountBadge: "OP-005",
    comments: "Conferir saldo DAC por gaveta.",
    status: "pending",
  },
];

export const mockPerformance: OperatorPerformance[] = [
  {
    badgeId: "OP-001",
    name: "Operador 01",
    counts: 54,
    divergences: 2,
    accuracy: 96.3,
    averageTimeMinutes: 11.4,
  },
  {
    badgeId: "OP-002",
    name: "Operador 02",
    counts: 49,
    divergences: 5,
    accuracy: 89.8,
    averageTimeMinutes: 13.2,
  },
  {
    badgeId: "OP-003",
    name: "Operador 03",
    counts: 62,
    divergences: 3,
    accuracy: 94.1,
    averageTimeMinutes: 10.7,
  },
];

export function isGlLocation(location: string) {
  return location.trim().toUpperCase().startsWith("GL");
}

export function isHrmCage(location: string) {
  return location.trim().toUpperCase() === "HRM CAGE";
}

export function toCsv(records: CountRecord[]) {
  const headers = [
    "id",
    "location",
    "pn",
    "quantity",
    "counterBadge",
    "comments",
    "countMode",
    "status",
    "createdAt",
  ];

  const rows = records.map((r) =>
    [
      r.id,
      r.location,
      r.pn,
      r.quantity,
      r.counterBadge,
      r.comments ?? "",
      r.countMode ?? "",
      r.status,
      r.createdAt,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function compareHrmCageData(
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

