import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "Upload mockado recebido com sucesso.",
  });
}

export async function DELETE() {
  return NextResponse.json({
    ok: true,
    message: "Uploads mockados limpos com sucesso.",
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Rota de upload ativa.",
  });
}

