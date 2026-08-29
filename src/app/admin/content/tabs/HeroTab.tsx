import { Camera, Plus, Save, Trash2 } from "lucide-react";
import { createHeroImage, deleteHeroImage, updateHeroImage } from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemControls } from "./ItemControls";
import type { HeroImageRow } from "./types";

export function HeroTab({ images }: { images: HeroImageRow[] }) {
  const fileInputCls =
    "w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-accent-foreground";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Foto Hero</CardTitle>
          <CardDescription>
            Foto produk yang tampil di hero halaman depan (maks 4 foto). Urutan menentukan posisi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createHeroImage} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="hero-name">Nama Tampilan</Label>
              <Input id="hero-name" name="name" required placeholder="mis. Kodak FZ55" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-ts">Timestamp (hiasan, opsional)</Label>
              <Input id="hero-ts" name="timestamp" placeholder="23 · 08 · 26" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-img">Foto (JPG/PNG/WebP, maks 5MB)</Label>
              <input id="hero-img" name="image" type="file" accept="image/jpeg,image/png,image/webp" className={fileInputCls} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="gap-1.5">
                <Plus className="size-4" aria-hidden />
                Tambah
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {images.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Belum ada foto hero — halaman depan akan menampilkan ikon placeholder.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {images.map((img, i) => (
            <Card key={img.id} className={!img.active ? "opacity-60" : undefined}>
              <CardContent className="space-y-3">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {img.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.imagePath} alt={img.name} className="size-full object-cover" />
                  ) : (
                    <Camera className="size-10 text-muted-foreground/30" aria-hidden />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{img.name}</p>
                  <ItemControls
                    collection="heroImage"
                    itemId={img.id}
                    active={img.active}
                    isFirst={i === 0}
                    isLast={i === images.length - 1}
                  />
                </div>
                <form action={updateHeroImage} className="space-y-2">
                  <input type="hidden" name="heroImageId" value={img.id} />
                  <div className="grid gap-2">
                    <Input name="name" defaultValue={img.name} aria-label="Nama tampilan" />
                    <Input name="timestamp" defaultValue={img.timestamp} placeholder="timestamp" aria-label="Timestamp" />
                  </div>
                  <input
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Ganti foto"
                    className={fileInputCls}
                  />
                  <div className="flex items-center justify-start">
                    <Button type="submit" size="sm" className="gap-1.5">
                      <Save className="size-3.5" aria-hidden />
                      Simpan
                    </Button>
                  </div>
                </form>
                <form action={deleteHeroImage} className="flex justify-end">
                  <input type="hidden" name="heroImageId" value={img.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Hapus
                  </button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
