import { notFound, redirect } from "next/navigation";
import {
  CalendarClock,
  PackageCheck,
  User,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah, getTierPrice } from "@/lib/pricing";
import { midtransConfigured } from "@/lib/payment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkoutOrder } from "../actions/checkout";
import { BackLink } from "@/components/BackLink";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const productId = Number(sp.productId ?? "");
  if (!Number.isInteger(productId) || productId <= 0) redirect("/");

  const quantity = Math.max(1, Number(sp.quantity ?? 1) || 1);
  const durationHours = Math.max(1, Number(sp.durationHours ?? 24) || 24);
  const startDateRaw = Array.isArray(sp.startDate) ? sp.startDate[0] : sp.startDate;
  const start = new Date(startDateRaw ?? new Date().toISOString());
  const end = new Date(start.getTime() + durationHours * 3600_000);
  if (isNaN(start.getTime())) redirect("/");

  const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
  if (!product) notFound();

  const unitPrice = getTierPrice(product, durationHours);
  const subtotal = Math.round(unitPrice * quantity);
  const hasMidtrans = midtransConfigured();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-10">
      <BackLink href={`/katalog/${product.id}`} label="Kembali ke Produk" className="mb-6" />


      <h1 className="text-xl font-bold tracking-tight md:text-2xl">Checkout</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Data Pemesan</CardTitle>
            <CardDescription>
              Data ini dipakai untuk konfirmasi booking via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={checkoutOrder} className="grid gap-5 sm:grid-cols-2">
              <input
                type="hidden"
                name="items"
                value={JSON.stringify([{ productId, quantity, durationHours }])}
              />
              <input type="hidden" name="startDate" value={start.toISOString()} />

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nama lengkap</Label>
                <Input id="name" name="name" placeholder="Nama sesuai identitas" required minLength={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">No. WhatsApp</Label>
                <Input id="phone" name="phone" placeholder="08xxxxxxxxxx" required pattern="^0\d{8,13}$" />
                <p className="text-xs text-muted-foreground">Format 08xxx</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opsional)</Label>
                <Input id="email" name="email" type="email" placeholder="nama@email.com" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Alamat</Label>
                <Input id="address" name="address" placeholder="Dipakai jika memilih diantar kurir" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">Catatan (opsional)</Label>
                <textarea
                  name="note"
                  id="note"
                  rows={3}
                  className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary"
                  placeholder="Permintaan khusus…"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Metode Pengantaran</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent has-checked:border-primary">
                    <input type="radio" name="deliveryMode" value="pickup" defaultChecked className="size-4 accent-emerald-600" />
                    Ambil sendiri
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent has-checked:border-primary">
                    <input type="radio" name="deliveryMode" value="courier" className="size-4 accent-emerald-600" />
                    Diantar kurir
                  </label>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Metode Pembayaran</Label>
                <div className="grid gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent has-checked:border-primary">
                    <input type="radio" name="paymentMethod" value="cash" defaultChecked className="size-4 accent-emerald-600" />
                    <span className="font-medium">Cash</span>
                    <span className="text-muted-foreground">— bayar saat pengambilan</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent has-checked:border-primary">
                    <input type="radio" name="paymentMethod" value="qris" className="size-4 accent-emerald-600" />
                    <span className="font-medium">QRIS</span>
                    <span className="text-muted-foreground">— scan, lalu upload bukti</span>
                  </label>
                  {hasMidtrans && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-accent has-checked:border-primary">
                      <input type="radio" name="paymentMethod" value="midtrans" className="size-4 accent-emerald-600" />
                      <span className="font-medium">Pembayaran Online</span>
                      <span className="text-muted-foreground">— QRIS dinamis, e-wallet, VA</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" className="h-11 w-full text-base">
                  Buat Pesanan
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl font-bold">
                  ×{quantity}
                </span>
                <div>
                  <p className="font-semibold leading-tight">{product.name}</p>
                  <p className="text-muted-foreground">{durationHours} jam sewa</p>
                </div>
              </div>

              <dl className="space-y-1.5 border-t pt-3">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Mulai</dt>
                  <dd className="flex items-center gap-1 font-medium tabular-nums">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {start.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Selesai</dt>
                  <dd className="flex items-center gap-1 font-medium tabular-nums">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {end.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Harga {durationHours} jam</dt>
                  <dd className="font-medium tabular-nums">{formatRupiah(unitPrice)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Jumlah</dt>
                  <dd className="font-medium tabular-nums">×{quantity}</dd>
                </div>
              </dl>

              <div className="flex items-baseline justify-between border-t pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold tabular-nums text-emerald-700">
                  {formatRupiah(subtotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <PackageCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              Stok dikunci sementara — admin mengonfirmasi ketersediaan unit.
            </p>
            <p className="flex items-start gap-1.5">
              <User className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              Siapkan KTP / kartu pelajar sebagai jaminan saat pengambilan.
            </p>
            <p className="flex items-start gap-1.5">
              <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              Konfirmasi dikirim admin via WhatsApp pada jam operasional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
