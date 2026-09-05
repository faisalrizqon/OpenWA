import { DeletePromoForm } from "./DeletePromoForm";
import { PromoDateField } from "./PromoDateField";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, BadgePercent, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SelectField } from "@/components/SelectField";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createPromo, togglePromoActive } from "@/actions/promos";
import { cn } from "@/lib/utils";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";

export const dynamic = "force-dynamic";

const dateFmt = (d: Date) => format(d, "dd MMMM yyyy", { locale: localeId });

const ERROR_MESSAGES: Record<string, string> = {
  code: "Kode tidak valid — 3-20 karakter huruf besar/angka/tanda - _.",
  value: "Nilai diskon tidak valid — harus > 0 (persen maks 100).",
  date: "Tanggal tidak valid — tanggal akhir harus setelah tanggal mulai.",
  code_taken: "Kode promo sudah dipakai.",
  invalid: "Data tidak valid — periksa kembali isian form.",
};

export default async function PromosPage({
  searchParams,
}: PageProps<"/admin/promos">) {
  const sp = await searchParams;
  const get = (key: string) => (Array.isArray(sp[key]) ? sp[key][0] : sp[key]) ?? "";
  const error = get("error");
  const created = get("created");
  const deleted = get("deleted");

  const promos = await prisma.promoCode.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  const now = new Date();

  const notifications: PageNotification[] = [];
  if (created === "1") notifications.push({ type: "success", message: "Kode promo berhasil dibuat." });
  if (deleted === "1") notifications.push({ type: "success", message: "Kode promo dihapus." });
  if (error) notifications.push({ type: "error", message: ERROR_MESSAGES[error] ?? decodeURIComponent(error) });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promo & Kupon"
        description="Buat kode diskon untuk checkout online — potongan amount (Rp) atau percent (%)."
      />

      <PageNotifier notifications={notifications} />

      {/* Form buat promo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgePercent className="size-5" aria-hidden />
            Buat Kode Promo
          </CardTitle>
          <CardDescription>
            Kode berlaku untuk checkout online; diskon dihitung dari subtotal item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPromo} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input
                id="code"
                name="code"
                required
                placeholder="mis. LEBARAN20"
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountType">Tipe Diskon</Label>
              <SelectField
                id="discountType"
                name="discountType"
                defaultValue="amount"
                options={[
                  { label: "Nominal (Rp)", value: "amount" },
                  { label: "Persen (%)", value: "percent" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountValue">Nilai Diskon</Label>
              <Input id="discountValue" name="discountValue" type="number" min="1" required placeholder="10000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Min. Order (Rp, opsional)</Label>
              <Input id="minOrderAmount" name="minOrderAmount" type="number" min="0" placeholder="50000" />
            </div>
            <PromoDateField name="startDate" label="Berlaku Mulai" />
            <PromoDateField name="endDate" label="Berlaku Sampai" />
            <div className="space-y-2">
              <Label htmlFor="maxDiscount">Plafon Diskon (Rp, opsional)</Label>
              <Input id="maxDiscount" name="maxDiscount" type="number" min="0" placeholder="maks potongan untuk persen" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usageLimit">Batas Pemakaian (0 = ∞)</Label>
              <Input id="usageLimit" name="usageLimit" type="number" min="0" defaultValue="0" />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" className="gap-1.5">
                <Plus className="size-4" aria-hidden />
                Buat Kode Promo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Daftar promo */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Kode</CardTitle>
          <CardDescription>{promos.length} kode promo</CardDescription>
        </CardHeader>
        <CardContent>
          {promos.length === 0 ? (
            <EmptyState
              icon={<BadgePercent className="size-5" aria-hidden />}
              title="Belum ada kode promo"
              description="Buat kode pertama lewat form di atas."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Diskon</TableHead>
                  <TableHead>Min. Order</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-center">Dipakai</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.map((p) => {
                  const expired = p.endDate < now;
                  const exhausted = p.usageLimit > 0 && p.usedCount >= p.usageLimit;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono font-semibold">{p.code}</TableCell>
                      <TableCell className="tabular-nums">
                        {p.discountType === "percent"
                          ? `${p.discountValue}%${p.maxDiscount ? ` (maks ${formatRupiah(p.maxDiscount)})` : ""}`
                          : formatRupiah(p.discountValue)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {p.minOrderAmount ? formatRupiah(p.minOrderAmount) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {dateFmt(p.startDate)}
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                          {dateFmt(p.endDate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {p.usedCount}
                        {p.usageLimit > 0 ? ` / ${p.usageLimit}` : ""}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                            !p.active
                              ? "bg-neutral-100 text-neutral-600"
                              : expired
                                ? "bg-red-100 text-red-700"
                                : exhausted
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-700"
                          )}
                        >
                          {!p.active ? "Nonaktif" : expired ? "Kedaluwarsa" : exhausted ? "Habis kuota" : "Aktif"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <form action={togglePromoActive}>
                            <input type="hidden" name="promoId" value={p.id} />
                            <input type="hidden" name="active" value={p.active ? "false" : "true"} />
                            <Button type="submit" variant="outline" size="sm">
                              {p.active ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                          </form>
                          <DeletePromoForm promoId={p.id} code={p.code} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
