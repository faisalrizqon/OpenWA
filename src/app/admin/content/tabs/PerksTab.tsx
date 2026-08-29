import { Plus, Save, Trash2 } from "lucide-react";
import { createPerk, deletePerk, updatePerk } from "@/actions/content";
import { PERK_ICONS } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { ItemControls } from "./ItemControls";
import type { PerkRow } from "./types";

export function PerksTab({ perks }: { perks: PerkRow[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Kartu Keunggulan</CardTitle>
          <CardDescription>
            Kartu kecil di bawah hero yang menjelaskan keunggulan toko (maks 3 agar rapi)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPerk} className="grid gap-4 sm:grid-cols-[140px_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="perk-icon">Ikon</Label>
              <SelectField
                id="perk-icon"
                name="icon"
                defaultValue="camera"
                options={PERK_ICONS.map((ic) => ({ label: ic, value: ic }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perk-title">Judul</Label>
              <Input id="perk-title" name="title" required placeholder="mis. Harga bersahabat" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perk-desc">Deskripsi</Label>
              <Input id="perk-desc" name="description" required placeholder="Tarif fleksibel 6/12/24/48 jam." />
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

      <div className="space-y-3">
        {perks.map((p, i) => (
          <Card key={p.id} className={!p.active ? "opacity-60" : undefined}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4">
              <form action={updatePerk} className="grid flex-1 gap-3 sm:grid-cols-[140px_1fr_1fr_auto]">
                <input type="hidden" name="perkId" value={p.id} />
                <SelectField
                  name="icon"
                  defaultValue={p.icon}
                  options={PERK_ICONS.map((ic) => ({ label: ic, value: ic }))}
                />
                <Input name="title" defaultValue={p.title} aria-label="Judul keunggulan" />
                <Input name="description" defaultValue={p.description} aria-label="Deskripsi keunggulan" />
                <div className="flex items-center justify-start">
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="size-3.5" aria-hidden />
                    Simpan
                  </Button>
                </div>
              </form>
              <div className="flex items-center gap-2">
                <ItemControls
                  collection="perk"
                  itemId={p.id}
                  active={p.active}
                  isFirst={i === 0}
                  isLast={i === perks.length - 1}
                />
                <form action={deletePerk}>
                  <input type="hidden" name="perkId" value={p.id} />
                  <button
                    type="submit"
                    className="flex size-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                    aria-label="Hapus keunggulan"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {perks.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Belum ada kartu keunggulan — section perks tidak akan tampil.
          </p>
        )}
      </div>
    </div>
  );
}
