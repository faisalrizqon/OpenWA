import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Star, ArrowLeft, ArrowRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function PortalReviewsPage({
  searchParams,
}: PageProps<"/portal/reviews">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (
    !session?.user ||
    session.user.role !== "customer" ||
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    redirect("/portal/login");
  }

  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const notifications: PageNotification[] = [];
  if (error === "invalid") {
    notifications.push({ type: "error", message: "Data review tidak valid." });
  } else if (error === "already") {
    notifications.push({ type: "info", message: "Review sudah pernah dikirim." });
  } else if (error && error !== "invalid" && error !== "already") {
    notifications.push({ type: "error", message: decodeURIComponent(error) });
  }

  // Ambil semua review dengan detail order terkait
  const reviews = await prisma.review.findMany({
    where: { customerId },
    include: {
      order: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  units: { select: { id: true, photoPath: true } },
                  images: { select: { filePath: true, sortOrder: true } },
                },
              },
            },
          },
          payments: true,
          documents: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8 md:py-12">
      <PageNotifier notifications={notifications} />

      {/* Header card: judul di atas tombol kembali */}
      <Card>
        <CardHeader className="space-y-3 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">Review Saya</h1>
              <p className="mt-1 text-sm text-muted-foreground">Ulasan yang kamu berikan untuk pesanan selesai</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Review terkirim: <span className="font-semibold">{reviews.length}</span>
            </p>
          </div>
          <Link href="/portal">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" aria-hidden /> Kembali ke Dashboard
            </Button>
          </Link>
        </CardHeader>
      </Card>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <Star className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Belum ada review</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Mulai beri review pada pesanan selesai untuk membantu toko dan pelanggan lainnya.
            </p>
            <Link
              href="/portal"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Lihat Pesanan
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{r.order!.orderNumber}</CardTitle>
                    <CardDescription>
                      {format(r.createdAt, "dd MMM yyyy HH:mm", { locale: localeId })} ·{" "}
                      {format(r.order!.startDate, "dd MMM yyyy", { locale: localeId })}{" "}
                      <ArrowRight className="size-3 inline text-muted-foreground" aria-hidden />{" "}
                      {format(r.order!.endDate, "dd MMM yyyy", { locale: localeId })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${
                          i < r.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300"
                        }`}
                        aria-hidden
                      />
                    ))}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {r.rating}/5
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {r.text && (
                  <p className="text-sm text-muted-foreground">"{r.text}"</p>
                )}
                {!r.text && (
                  <p className="text-sm italic text-muted-foreground">Tanpa komentar</p>
                )}

                {/* Item review & status */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                  <div className="flex items-center gap-3">
                    {r.order!.items.map((it, idx) => (
                      <span key={idx} className="truncate rounded-full bg-accent/50 px-2 py-1">
                        {it.product.name}
                      </span>
                    ))}
                  </div>
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3" aria-hidden />
                    Status: {r.order!.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
