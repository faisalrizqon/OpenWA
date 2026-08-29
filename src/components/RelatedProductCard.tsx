import Link from "next/link";
import { Camera } from "lucide-react";
import { formatRupiah, lowestPrice } from "@/lib/shop";
import { storageUrl } from "@/lib/storage-url";
import { productPhotosOf } from "@/lib/productPhotos";

interface RelatedProductCardProps {
  id: number;
  name: string;
  categoryName: string;
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
  units: { id: number; photoPath: string | null; serialNumber?: string | null }[];
  images: { filePath: string }[];
  /** Prefix link tujuan — "/katalog" (publik) atau "/portal/catalog" (portal). */
  hrefPrefix?: string;
}

/** Kartu mini untuk bagian "Produk serupa" — ukuran compact seperti kartu
 *  sebelumnya: baris horizontal, thumbnail 56px di kiri, lalu kategori dan
 *  nama (1 baris) di kanan, plus harga mulai yang kecil di bawah nama.
 *  Gambar mengikuti foto produk asli (jalur productPhotosOf). */
export function RelatedProductCard(p: RelatedProductCardProps) {
  const { main } = productPhotosOf(p);
  const price = lowestPrice(p);

  return (
    <Link
      href={`${p.hrefPrefix ?? "/katalog"}/${p.id}`}
      className="group flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-muted/50"
    >
      {/* Thumbnail produk — 56px (size-14), sama dengan ukuran sebelumnya */}
      <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={storageUrl(main.src)} alt={p.name} className="size-full object-cover" />
        ) : (
          <Camera className="size-6 text-muted-foreground/40" aria-hidden />
        )}
      </span>

      {/* Info — kategori kecil, nama 1 baris, harga mulai kecil */}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{p.categoryName}</p>
        <p className="truncate text-sm font-medium group-hover:text-primary">{p.name}</p>
        {price > 0 && (
          <p className="mt-0.5 text-xs font-medium text-emerald-700">
            Mulai {formatRupiah(price)}
          </p>
        )}
      </div>
    </Link>
  );
}
