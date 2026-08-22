import Link from "next/link";
import { createCustomer } from "@/actions/customers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default async function NewCustomerPage({
  searchParams,
}: PageProps<"/customers/new">) {
  const { error } = await searchParams;

  return (
    <div className="p-4 space-y-6 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Pelanggan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          <Link href="/customers" className="hover:underline">
            ← Kembali ke daftar pelanggan
          </Link>
        </p>
      </div>

      {error === "phone" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Nomor WA sudah terdaftar atau tidak valid
        </p>
      )}
      {error === "invalid" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Data tidak valid — nama wajib, nomor WA format 08xxx (9–14 digit)
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pelanggan Baru</CardTitle>
          <CardDescription>Data pelanggan untuk identitas & kontak WA</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCustomer} className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <textarea
                id="notes"
                name="notes"
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Simpan Pelanggan</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
