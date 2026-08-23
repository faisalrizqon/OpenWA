import Link from "next/link";
import { ArrowLeft, PackageCheck, Tag } from "lucide-react";
import { prisma } from "@/lib/db";
import { getStoreSettings } from "@/lib/content";
import { formatRupiah, waLink, inquiryMessage } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricelist — MudahSewa",
  description: "Daftar harga sewa kamera & digicam per durasi (6/12/24/48 jam).",
};

const TIERS = [
  { key: "price6h" as const, label: "6 jam" },
  { key: "price12h" as const, label: "12 jam" },
  { key: "price24h" as const, label: "24 jam" },
  { key: "price48h" as const, label: "48 jam" },
];

export default async function PricelistPage() {
  const shop = await getStoreSettings();
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    include: {
      category: { select: { name: true } },
      units: { where: { status: { notIn: ["maintenance", "lost"] } }, select: { id: true } },
    },
  });

  // Kelompokkan per kategori
  const byCategory = new Map<string, typeof products>();
  for (const p of products) {
    const key = p.category.name;
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Katalog
      </Link>

      <div className="mb-8">
        <p className="font-mono text-xs font-bold tracking-widest text-primary">PRICELIST</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Daftar Harga Sewa
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Harga per unit · {shop.storeName} · {shop.location}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Belum ada produk tersedia.
        </p>
      ) : (
        <div className="space-y-8">
          {Array.from(byCategory.entries()).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="size-4 text-primary" aria-hidden />
                  {cat}
                </CardTitle>
                <CardDescription>
                  {items.length} produk · harga flat per durasi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        {TIERS.map((t) => (
                          <TableHead key={t.key} className="whitespace-nowrap text-right">
                            {t.label}
                          </TableHead>
                        ))}
                        <TableHead className="text-center">Stok</TableHead>
                        <TableHead className="text-right">Booking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((p) => {
                        const available = p.units.length;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <Link
                                href={`/katalog/${p.id}`}
                                className="font-medium hover:text-primary hover:underline"
                              >
                                {p.name}
                              </Link>
                              <p className="font-mono text-[10px] text-muted-foreground">{p.sku}</p>
                            </TableCell>
                            {TIERS.map((t) => {
                              const price = p[t.key] as number;
                              return (
                                <TableCell
                                  key={t.key}
                                  className="whitespace-nowrap text-right tabular-nums"
                                >
                                  {price > 0 ? (
                                    formatRupiah(price)
                                  ) : (
                                    <span className="text-muted-foreground/50">—</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              <span
                                className={
                                  available > 0
                                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                                    : "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700"
                                }
                              >
                                <PackageCheck className="size-3" aria-hidden />
                                {available > 0 ? available : "Kosong"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <a
                                href={waLink(shop.whatsapp, inquiryMessage(shop.storeName, p.name, p.sku))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                              >
                                <WhatsAppIcon className="size-3.5" aria-hidden />
                                WA
                              </a>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Durasi di luar pilihan dihitung kelipatan harga 24 jam · Pembayaran bisa cash, QRIS,
        atau online · Pastikan stok via WhatsApp sebelum datang.
      </p>
    </div>
  );
}
