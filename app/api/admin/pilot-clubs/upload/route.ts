// app/api/admin/pilot-clubs/upload/route.ts
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED_ROLES: UserRole[] = ["admin", "support", "kyc_reviewer"];

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function normalizeKind(value: string | null): "logo" | "photo" | null {
  return value === "logo" || value === "photo" ? value : null;
}

async function requireAdminRole() {
  const user = await getAuthUser();
  if (!user) return { ok: false as const, status: 401 };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || !ALLOWED_ROLES.includes(dbUser.role)) {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRole();
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: guard.status },
    );
  }

  const url = new URL(req.url);
  const kind = normalizeKind(url.searchParams.get("kind"));

  if (!kind) {
    return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data" }, { status: 400 });
  }

  const fileEntry = form.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ ok: false, error: "File is required" }, { status: 400 });
  }

  const ext = ALLOWED_MIME[fileEntry.type];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: "Only JPG, PNG and WEBP are allowed" },
      { status: 400 },
    );
  }

  const maxBytes = kind === "logo" ? 2 * 1024 * 1024 : 6 * 1024 * 1024;
  if (fileEntry.size <= 0 || fileEntry.size > maxBytes) {
    return NextResponse.json(
      {
        ok: false,
        error:
          kind === "logo"
            ? "Logo file is too large (max 2 MB)"
            : "Photo file is too large (max 6 MB)",
      },
      { status: 400 },
    );
  }

  const subdir = kind === "logo" ? "logos" : "photos";
  const publicDir = path.join(process.cwd(), "public");
  const targetDir = path.join(publicDir, "uploads", "pilot-clubs", subdir);

  await mkdir(targetDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const absPath = path.join(targetDir, fileName);

  const bytes = Buffer.from(await fileEntry.arrayBuffer());
  await writeFile(absPath, bytes);

  const fileUrl = `/uploads/pilot-clubs/${subdir}/${fileName}`;

  return NextResponse.json({
    ok: true,
    kind,
    url: fileUrl,
    size: fileEntry.size,
    mime: fileEntry.type,
  });
}
