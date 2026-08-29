import { NextResponse } from "next/server";
import { getUpdateProgress } from "@/actions/openwa-update";

/**
 * GET /api/update-progress — baca file progress update (ditulis
 * scripts/openwa-updater.cjs). Body kosong + 404 bila tidak ada update
 * berjalan/baru selesai. Dipoll oleh useUpdateProgress tiap 3 detik.
 */
export async function GET() {
  const progress = await getUpdateProgress();
  if (!progress) {
    return NextResponse.json(null, { status: 404 });
  }
  return NextResponse.json(progress);
}
