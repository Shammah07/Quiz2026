import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type TournamentStore = Record<string, unknown>;

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "tournament.json");

async function readStore(): Promise<TournamentStore> {
  try {
    return JSON.parse(await readFile(dataFile, "utf8")) as TournamentStore;
  } catch {
    return {};
  }
}

async function writeStore(store: TournamentStore) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "A storage key is required." }, { status: 400 });

  const store = await readStore();
  return NextResponse.json(store[key] ?? null, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  let body: { key?: string; value?: unknown };
  try {
    body = (await request.json()) as { key?: string; value?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: "A key and value are required." }, { status: 400 });
  }

  const store = await readStore();
  store[body.key] = body.value;
  await writeStore(store);
  return NextResponse.json({ ok: true });
}