import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FlowInstructions() {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">1</span>
          Alur Order
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p><strong>Order baru</strong> dibuat otomatis sebagai <span className="font-medium text-foreground">Booking</span>. Admin mengklik tombol <strong>Aktifkan</strong> (atau ubah status via dropdown) saat barang diambil customer — unit akan ter-assign ke stok.</p>
        <p>Setelah masa sewa habis, tandai <strong>Terlambat</strong> jika memang belum kembali. Klik selesaikan setelah item dikembalikan (tambah foto return & catatan kondisi).</p>
        <p>Pembayaran dicatat: DP saat booking, pelunasan sebelum/sehabis sewa, atau denda kalau telat.</p>
        <hr className="my-2 border-border" />
        <p><strong>Edit/Hapus</strong> pembayaran bisa langsung lewat kolom Aksi per baris. Semua order bebas diubah statusnya kapan saja (tidak ada batasan workflow). Hapus order hanya jika benar-benar batal dan ingin data hilang permanen.</p>
      </CardContent>
    </Card>
  );
}
