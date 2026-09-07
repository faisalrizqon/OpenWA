import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getStoreSettings } from "@/lib/content";

/**
 * Favicon dinamis BULAT — tab browser mengikuti logo toko dari database
 * (Admin > Konten > Identitas Toko), dipotong menjadi lingkaran dengan
 * sudut transparan (PNG) supaya tidak terlihat "kotak" di tab browser.
 *
 * File statis `app/favicon.ico` sengaja dihapus agar route ini yang
 * melayani permintaan browser ke /favicon.ico. Bila logo belum diupload,
 * kembalikan 204 (tanpa ikon).
 */
const SIZE = 128;
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { buf: Buffer; at: number }>();

/** Mask lingkaran putih penuh — dipakai sebagai blend dest-in agar
 *  bagian di luar lingkaran menjadi transparan. */
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
        "Cache-Control": "public, max-age=300, must-revalidate",
      },
    });
  }

  // logoPath berbentuk "/uploads/logo/xxx.ext" → baca dari public/
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
      .png()
      .toBuffer();
  } catch {
    // sharp gagal (format tak didukung dll) — sajikan apa adanya
    buf = raw;
    type = "image/jpeg";
  }

  cache.set(logoPath, { buf, at: now });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
