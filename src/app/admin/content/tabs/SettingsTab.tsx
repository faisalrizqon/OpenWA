import { Save } from "lucide-react";
import { updateStoreSettings } from "@/actions/content";
import { HERO_VARIANTS, THEMES, type StoreSettings } from "@/lib/content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { Textarea } from "@/components/ui/textarea";

export function SettingsTab({ settings }: { settings: StoreSettings }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Identitas toko */}
      <Card>
        <CardHeader>
          <CardTitle>Identitas Toko</CardTitle>
          <CardDescription>
            Tampil di header, footer, dan tombol WhatsApp seluruh halaman storefront
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateStoreSettings} className="space-y-4">
            {/* Kirim semua field — form ini hanya mengedit sebagian */}
            <input type="hidden" name="theme" value={settings.theme} />
            <input type="hidden" name="heroVariant" value={settings.heroVariant} />
            <input type="hidden" name="heroTitleBefore" value={settings.heroTitleBefore} />
            <input type="hidden" name="heroAccent" value={settings.heroAccent} />
            <input type="hidden" name="heroTitleAfter" value={settings.heroTitleAfter} />
            <input type="hidden" name="heroSubtitle" value={settings.heroSubtitle} />
            <input type="hidden" name="trustBadge1" value={settings.trustBadge1} />
            <input type="hidden" name="trustBadge2" value={settings.trustBadge2} />
            <input type="hidden" name="trustBadge3" value={settings.trustBadge3} />
            <input type="hidden" name="catalogTitle" value={settings.catalogTitle} />
            <input type="hidden" name="testimonialTitle" value={settings.testimonialTitle} />
            <input type="hidden" name="testimonialSubtitle" value={settings.testimonialSubtitle} />
            <input type="hidden" name="videoTitle" value={settings.videoTitle} />
            <input type="hidden" name="videoSubtitle" value={settings.videoSubtitle} />
            <input type="hidden" name="ctaTitle" value={settings.ctaTitle} />
            <input type="hidden" name="ctaSubtitle" value={settings.ctaSubtitle} />
            <input type="hidden" name="qrisImagePath" value={settings.qrisImagePath} />
            <input type="hidden" name="qrisMerchantName" value={settings.qrisMerchantName} />

            <div className="space-y-2">
              <Label htmlFor="storeName">Nama Toko</Label>
              <Input id="storeName" name="storeName" required defaultValue={settings.storeName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" name="tagline" defaultValue={settings.tagline} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Nomor WhatsApp (format 08xx)</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                required
                defaultValue={settings.whatsapp}
                placeholder="081234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input id="location" name="location" defaultValue={settings.location} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Jam Operasional</Label>
              <Input id="hours" name="hours" defaultValue={settings.hours} />
            </div>
            <div className="flex justify-start pt-2">
              <Button type="submit" className="gap-1.5">
                <Save className="size-4" aria-hidden />
                Simpan Identitas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tampilan hero + QRIS */}
      <Card>
        <CardHeader>
          <CardTitle>Tampilan Halaman Depan</CardTitle>
          <CardDescription>Varian hero, tema, headline, dan badge kepercayaan</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateStoreSettings} className="space-y-4">
            <input type="hidden" name="storeName" value={settings.storeName} />
            <input type="hidden" name="tagline" value={settings.tagline} />
            <input type="hidden" name="whatsapp" value={settings.whatsapp} />
            <input type="hidden" name="location" value={settings.location} />
            <input type="hidden" name="hours" value={settings.hours} />
            <input type="hidden" name="trustBadge1" value={settings.trustBadge1} />
            <input type="hidden" name="trustBadge2" value={settings.trustBadge2} />
            <input type="hidden" name="trustBadge3" value={settings.trustBadge3} />
            <input type="hidden" name="catalogTitle" value={settings.catalogTitle} />
            <input type="hidden" name="testimonialTitle" value={settings.testimonialTitle} />
            <input type="hidden" name="testimonialSubtitle" value={settings.testimonialSubtitle} />
            <input type="hidden" name="videoTitle" value={settings.videoTitle} />
            <input type="hidden" name="videoSubtitle" value={settings.videoSubtitle} />
            <input type="hidden" name="ctaTitle" value={settings.ctaTitle} />
            <input type="hidden" name="ctaSubtitle" value={settings.ctaSubtitle} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heroVariant">Varian Hero</Label>
                <SelectField
                  id="heroVariant"
                  name="heroVariant"
                  defaultValue={settings.heroVariant}
                  options={HERO_VARIANTS.map((v) => ({ label: v, value: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme">Tema Warna</Label>
                <SelectField
                  id="theme"
                  name="theme"
                  defaultValue={settings.theme}
                  options={THEMES.map((t) => ({ label: t, value: t }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroTitleBefore">Judul Hero — Sebelum Aksen</Label>
              <Input id="heroTitleBefore" name="heroTitleBefore" defaultValue={settings.heroTitleBefore} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heroAccent">Kata Aksen (italic + warna)</Label>
                <Input id="heroAccent" name="heroAccent" defaultValue={settings.heroAccent} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heroTitleAfter">Judul Hero — Setelah Aksen</Label>
                <Input id="heroTitleAfter" name="heroTitleAfter" defaultValue={settings.heroTitleAfter} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Subjudul Hero</Label>
              <Textarea id="heroSubtitle" name="heroSubtitle" defaultValue={settings.heroSubtitle} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="trustBadge1">Badge Kepercayaan 1</Label>
                <Input id="trustBadge1" name="trustBadge1" defaultValue={settings.trustBadge1} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trustBadge2">Badge Kepercayaan 2</Label>
                <Input id="trustBadge2" name="trustBadge2" defaultValue={settings.trustBadge2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trustBadge3">Badge Kepercayaan 3</Label>
                <Input id="trustBadge3" name="trustBadge3" defaultValue={settings.trustBadge3} />
              </div>
            </div>
            {/* QRIS dikonfigurasi di tab Pembayaran — kirim nilai agar tidak tertimpa */}
            <input type="hidden" name="qrisImagePath" value={settings.qrisImagePath} />
            <input type="hidden" name="qrisMerchantName" value={settings.qrisMerchantName} />
            <div className="flex justify-start pt-2">
              <Button type="submit" className="gap-1.5">
                <Save className="size-4" aria-hidden />
                Simpan Tampilan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Judul section */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Judul & Teks Section Halaman Depan</CardTitle>
          <CardDescription>Teks pembuka tiap section di bawah hero</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateStoreSettings} className="space-y-4">
            <input type="hidden" name="storeName" value={settings.storeName} />
            <input type="hidden" name="tagline" value={settings.tagline} />
            <input type="hidden" name="whatsapp" value={settings.whatsapp} />
            <input type="hidden" name="location" value={settings.location} />
            <input type="hidden" name="hours" value={settings.hours} />
            <input type="hidden" name="theme" value={settings.theme} />
            <input type="hidden" name="heroVariant" value={settings.heroVariant} />
            <input type="hidden" name="heroTitleBefore" value={settings.heroTitleBefore} />
            <input type="hidden" name="heroAccent" value={settings.heroAccent} />
            <input type="hidden" name="heroTitleAfter" value={settings.heroTitleAfter} />
            <input type="hidden" name="heroSubtitle" value={settings.heroSubtitle} />
            <input type="hidden" name="trustBadge1" value={settings.trustBadge1} />
            <input type="hidden" name="trustBadge2" value={settings.trustBadge2} />
            <input type="hidden" name="trustBadge3" value={settings.trustBadge3} />
            <input type="hidden" name="qrisImagePath" value={settings.qrisImagePath} />
            <input type="hidden" name="qrisMerchantName" value={settings.qrisMerchantName} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="catalogTitle">Judul Katalog</Label>
                <Input id="catalogTitle" name="catalogTitle" defaultValue={settings.catalogTitle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonialTitle">Judul Testimoni</Label>
                <Input id="testimonialTitle" name="testimonialTitle" defaultValue={settings.testimonialTitle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="testimonialSubtitle">Subjudul Testimoni</Label>
                <Input id="testimonialSubtitle" name="testimonialSubtitle" defaultValue={settings.testimonialSubtitle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoTitle">Judul Video</Label>
                <Input id="videoTitle" name="videoTitle" defaultValue={settings.videoTitle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoSubtitle">Subjudul Video</Label>
                <Input id="videoSubtitle" name="videoSubtitle" defaultValue={settings.videoSubtitle} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaTitle">Judul CTA (Tanya Admin)</Label>
                <Input id="ctaTitle" name="ctaTitle" defaultValue={settings.ctaTitle} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ctaSubtitle">Subjudul CTA</Label>
                <Textarea id="ctaSubtitle" name="ctaSubtitle" defaultValue={settings.ctaSubtitle} />
              </div>
            </div>
            <div className="flex justify-start pt-2">
              <Button type="submit" className="gap-1.5">
                <Save className="size-4" aria-hidden />
                Simpan Teks Section
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
