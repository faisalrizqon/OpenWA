import { createCustomer } from "@/actions/customers";
import { PageHeader } from "@/components/PageHeader";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function NewCustomerPage({
  searchParams,
}: PageProps<"/admin/customers/new">) {
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;

  const notifications: PageNotification[] = [];
  if (error === "phone") {
    notifications.push({ type: "error", message: "Nomor WA sudah terdaftar atau tidak valid." });
  }
  if (error === "invalid") {
    notifications.push({ type: "error", message: "Data tidak valid — nama wajib, nomor WA format 08xxx (9–14 digit)." });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Pelanggan"
        description="Data identitas & kontak WA"
        backHref="/admin/customers"
      />
      <PageNotifier notifications={notifications} />

      <Card>
        <CardHeader>
          <CardTitle>Pelanggan Baru</CardTitle>
          <CardDescription>Dokumen (KTP dll.) diunggah setelah pelanggan tersimpan</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCustomer} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" required placeholder="mis. Budi" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor WA</Label>
              <Input id="phone" name="phone" required placeholder="08xxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (opsional)</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat (opsional)</Label>
              <Input id="address" name="address" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <textarea
                id="notes"
                name="notes"
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Simpan Pelanggan</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
