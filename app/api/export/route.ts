import { NextResponse } from "next/server";
import { mockCounts, toCsv } from "../../../lib/utils";

export async function GET() {
  const csv = toCsv(mockCounts);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="count-export.csv"',
    },
  });
}
