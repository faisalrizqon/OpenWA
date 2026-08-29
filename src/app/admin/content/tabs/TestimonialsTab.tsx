import { Plus, Save, Star, Trash2 } from "lucide-react";
import { createTestimonial, deleteTestimonial, updateTestimonial } from "@/actions/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ItemControls } from "./ItemControls";
import type { TestimonialRow } from "./types";

export function TestimonialsTab({ testimonials }: { testimonials: TestimonialRow[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Testimoni</CardTitle>
          <CardDescription>Review pelanggan yang tampil di section testimoni</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createTestimonial} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="t-name">Nama</Label>
              <Input id="t-name" name="name" required placeholder="mis. Salsa" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-rating">Rating (1-5)</Label>
              <Input id="t-rating" name="rating" type="number" min="1" max="5" defaultValue={5} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-context">Konteks Sewa</Label>
              <Input id="t-context" name="context" placeholder="mis. Sewa digicam untuk liburan ke Dieng" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-text">Isi Testimoni</Label>
              <Textarea id="t-text" name="text" required placeholder="Prosesnya cepet banget! ..." />
            </div>
            <div className="flex justify-start sm:col-span-2">
              <Button type="submit" className="gap-1.5">
                <Plus className="size-4" aria-hidden />
                Tambah Testimoni
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {testimonials.map((t, i) => (
          <Card key={t.id} className={!t.active ? "opacity-60" : undefined}>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                  <span className="font-medium">{t.name}</span>
                  {t.context && <Badge variant="secondary">{t.context}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <ItemControls
                    collection="testimonial"
                    itemId={t.id}
                    active={t.active}
                    isFirst={i === 0}
                    isLast={i === testimonials.length - 1}
                  />
                  <form action={deleteTestimonial}>
                    <input type="hidden" name="testimonialId" value={t.id} />
                    <button
                      type="submit"
                      className="flex size-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                      aria-label="Hapus testimoni"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </form>
                </div>
              </div>
              <form action={updateTestimonial} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="testimonialId" value={t.id} />
                <Input name="name" defaultValue={t.name} aria-label="Nama" />
                <Input name="rating" type="number" min="1" max="5" defaultValue={t.rating} aria-label="Rating" />
                <Input name="context" defaultValue={t.context} aria-label="Konteks" className="sm:col-span-2" />
                <Textarea name="text" defaultValue={t.text} aria-label="Isi testimoni" className="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" className="gap-1.5">
                    <Save className="size-3.5" aria-hidden />
                    Simpan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ))}
        {testimonials.length === 0 && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Belum ada testimoni — section testimoni tidak akan tampil.
          </p>
        )}
      </div>
    </div>
  );
}
