import { prisma } from "@/lib/db";
import { getStoreSettings } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import {
  ContentTabs,
  CONTENT_TAB_IDS,
  SettingsTab,
  HeroTab,
  PerksTab,
  TestimonialsTab,
  VideosTab,
} from "./tabs";

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const sp = await searchParams;
  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = CONTENT_TAB_IDS.includes(tabRaw ?? "") ? (tabRaw as string) : "settings";
  const saved = (Array.isArray(sp.saved) ? sp.saved[0] : sp.saved) === "1";
  const deleted = (Array.isArray(sp.deleted) ? sp.deleted[0] : sp.deleted) === "1";
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const notifications: PageNotification[] = [];
  if (saved) notifications.push({ type: "success", message: "Perubahan berhasil disimpan dan halaman depan sudah diperbarui." });
  if (deleted) notifications.push({ type: "success", message: "Item berhasil dihapus." });
  if (error) {
    notifications.push({
      type: "error",
      message:
        error === "file"
          ? "File tidak valid — maksimal 15MB (file di atas 3MB dikompres otomatis)."
          : error === "none"
            ? "Minimal satu metode pembayaran harus aktif."
            : "Data tidak valid — periksa kembali isian form.",
    });
  }

  const [settings, heroImages, perks, testimonials, videos] = await Promise.all([
    getStoreSettings(),
    prisma.heroImage.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.perk.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.videoContent.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konten Toko"
        description="Kontrol semua teks, gambar, dan section yang tampil di halaman depan (katalog publik)"
      />
      <PageNotifier notifications={notifications} />
      <ContentTabs active={tab} />

      {tab === "settings" && <SettingsTab settings={settings} />}
      {tab === "hero" && <HeroTab images={heroImages} />}
      {tab === "perks" && <PerksTab perks={perks} />}
      {tab === "testimonials" && <TestimonialsTab testimonials={testimonials} />}
      {tab === "videos" && <VideosTab videos={videos} />}
    </div>
  );
}
