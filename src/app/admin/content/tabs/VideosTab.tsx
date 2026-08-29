import { Plus, Save, Trash2 } from "lucide-react";
import { createVideo, deleteVideo, updateVideo } from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemControls } from "./ItemControls";
import type { VideoRow } from "./types";

export function VideosTab({ videos }: { videos: VideoRow[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Video / Tutorial</CardTitle>
          <CardDescription>
            Kartu konten video di halaman depan — isi link YouTube / TikTok / Instagram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createVideo} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="v-title">Judul</Label>
              <Input id="v-title" name="title" required placeholder="mis. Review Kodak Pixpro FZ55" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-href">Link Video</Label>
              <Input id="v-href" name="href" placeholder="https://..." defaultValue="#" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="v-desc">Deskripsi</Label>
              <Input id="v-desc" name="description" placeholder="Deskripsi singkat konten" />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="gap-1.5">
                <Plus className="size-4" aria-hidden />
                Tambah Video
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {videos.map((v, i) => (
          <Card key={v.id} className={!v.active ? "opacity-60" : undefined}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="truncate font-medium">{v.title}</p>
                <div className="flex items-center gap-2">
                  <ItemControls
                    collection="videoContent"
                    itemId={v.id}
                    active={v.active}
                    isFirst={i === 0}
                    isLast={i === videos.length - 1}
                  />
                  <form action={deleteVideo}>
                    <input type="hidden" name="videoId" value={v.id} />
                    <button
                      type="submit"
                      className="flex size-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                      aria-label="Hapus video"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </form>
                </div>
              </div>
              <form action={updateVideo} className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input type="hidden" name="videoId" value={v.id} />
                <Input name="title" defaultValue={v.title} aria-label="Judul" />
                <Input name="href" defaultValue={v.href} aria-label="Link" />
                <Input name="description" defaultValue={v.description} aria-label="Deskripsi" />
                <div className="flex items-center justify-start">
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="size-3.5" aria-hidden />
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
        {videos.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Belum ada konten video — section video tidak akan tampil.
          </p>
        )}
      </div>
    </div>
  );
}
