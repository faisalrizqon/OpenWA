import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getStoreSettings } from "@/lib/content";

/**
 * Apple touch icon dinamis BULAT — iOS home screen mengikuti logo toko
 * (Admin > Konten > Identitas Toko), dipotong lingkaran supaya tidak kotak.
 * iOS mengabaikan transparansi, jadi lingkaran diletakkan di atas latar
 * putih solid. Bila belum ada logo, kembalikan 204.
 */
const SIZE = 180; // Standar Apple Touch Icon minimum 180x180
const CACHE_TTL_MS = 300_000;
const cache = new Map<string, { buf: Buffer; at: number }>();

function circleMask(size: number): Buffer {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  );
}

export async function GET() {
  const settings = await getStoreSettings();
  const logoPath = settings.logoPath;

  if (!logoPath) {
    return new NextResponse(null, { status: 204 });
  }

  const now = Date.now();
  const hit = cache.get(logoPath);
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return new NextResponse(new Uint8Array(hit.buf), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=600, must-revalidate",
      },
    });
  }

  const abs = path.join(process.cwd(), "public", logoPath.replace(/^\/+/, ""));

  let raw: Buffer;
  try {
    raw = await fs.readFile(abs);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  let buf: Buffer;
  let type = "image/png";
  try {
    buf = await sharp(raw)
      .resize(SIZE, SIZE, { fit: "cover", position: "centre" })
      .composite([{ input: circleMask(SIZE), blend: "dest-in" }])
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
  } catch {
    buf = raw;
    type = "image/jpeg";
  }

  cache.set(logoPath, { buf, at: now });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=600, must-revalidate",
    },
  });
}
