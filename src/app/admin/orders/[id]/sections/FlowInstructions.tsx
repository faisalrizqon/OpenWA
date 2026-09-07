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
        <p><strong>Order baru</strong> dibuat otomatis sebagai <span className="font-medium text-foreground">Booking</span>. Ubah status via <span className="font-medium text-foreground">picker berwarna</span> di bagian bawah — pilih Aktif, Terlambat, Selesai, atau Dibatalkan. Unit akan ter-assign saat status menjadi Aktif.</p>
        <p><strong>Order draft</strong> (dari katalog online) belum resmi masuk — customer masih melengkapi pembayaran & jaminan. Setelah customer klik <span className="font-medium text-foreground">"Selesaikan Orderan"</span>, status berubah draft → booking dan baru dihitung incoming.</p>
        <p>Pembayaran dicatat: DP saat booking, pelunasan sebelum/sehabis sewa, atau denda kalau telat.</p>
        <hr className="my-2 border-border" />
        <p><strong>Edit/Hapus</strong> pembayaran bisa langsung lewat kolom Aksi per baris. Semua order bebas diubah statusnya kapan saja (tidak ada batasan workflow). Hapus order hanya jika benar-benar batal dan ingin data hilang permanen — tombolnya ada di sebelah Simpan pada row paling bawah.</p>
      </CardContent>
    </Card>
  );
}
