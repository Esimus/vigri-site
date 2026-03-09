// app/api/admin/support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { FormSubmissionKind, FormSubmissionStatus, Prisma, UserRole } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "support", "kyc_reviewer"];

const StatusParam = z.enum(["all", "new", "in_review", "done", "spam", "archived"]);

function parseLimit(req: NextRequest): number {
  const url = new URL(req.url);
  const raw = url.searchParams.get("limit");
  const n = raw ? Number(raw) : 200;
  if (!Number.isFinite(n) || n <= 0) return 200;
  return Math.min(500, Math.floor(n));
}

function parseKinds(req: NextRequest): FormSubmissionKind[] {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("kinds") || "").trim();

  const allowed: FormSubmissionKind[] = ["club_pilot", "ambassador", "faq_question", "other"];

  // default: what you need now
  if (!raw) return ["club_pilot", "ambassador"];

  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: FormSubmissionKind[] = [];
  for (const p of parts) {
    if (allowed.includes(p as FormSubmissionKind)) out.push(p as FormSubmissionKind);
  }

  return out.length ? out : ["club_pilot", "ambassador"];
}

function parseStatus(req: NextRequest): FormSubmissionStatus | "all" {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("status") || "all").trim();
  const parsed = StatusParam.safeParse(raw);
  return parsed.success ? parsed.data : "all";
}

function parseQ(req: NextRequest): string {
  const url = new URL(req.url);
  return (url.searchParams.get("q") || "").trim();
}

function getPayloadRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getPayloadString(value: unknown, key: string): string | null {
  const obj = getPayloadRecord(value);
  const raw = obj?.[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const limit = parseLimit(req);
  const kinds = parseKinds(req);
  const status = parseStatus(req);
  const q = parseQ(req);

  const where: Prisma.FormSubmissionWhereInput = {
    kind: { in: kinds },
  };

  if (status !== "all") where.status = status;

  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { telegram: { contains: q, mode: "insensitive" } },
      { subject: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { country: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, grouped] = await Promise.all([
    prisma.formSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        kind: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        contactName: true,
        email: true,
        phone: true,
        telegram: true,
        preferredLang: true,
        country: true,
        city: true,
        subject: true,
        message: true,
        payload: true,
        sourcePath: true,
        internalNote: true,
      },
    }),
    prisma.formSubmission.groupBy({
      by: ["status"],
      where: { kind: { in: kinds } },
      _count: { _all: true },
    }),
  ]);

  const totals: Record<FormSubmissionStatus, number> = {
    new: 0,
    in_review: 0,
    done: 0,
    spam: 0,
    archived: 0,
  };

  for (const row of grouped) {
    totals[row.status] = row._count._all;
  }

  return NextResponse.json({
    ok: true,
    limit,
    kinds,
    status,
    q,
    totals,
    items: rows.map((r) => ({
      ...r,
      clubName: getPayloadString(r.payload, "clubName"),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
}

const PatchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "in_review", "done", "spam", "archived"]).optional(),
  internalNote: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;

  const update: Prisma.FormSubmissionUpdateInput = {};
  if (typeof data.status !== "undefined") update.status = data.status;
  if (typeof data.internalNote !== "undefined") update.internalNote = data.internalNote;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }

  await prisma.formSubmission.update({
    where: { id: data.id },
    data: update,
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
} 