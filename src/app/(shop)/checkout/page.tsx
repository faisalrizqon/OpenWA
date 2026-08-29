import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { productPhotosOf } from "@/lib/productPhotos";
import { storageUrl } from "@/lib/storage-url";
import { getTierPrice } from "@/lib/pricing";
import { CheckoutForm } from "@/components/CheckoutForm";
import { BackLink } from "@/components/BackLink";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { checkoutOrder } from "../actions/checkout";

export const dynamic = "force-dynamic";

/** Ongkos antar default (Rp) — bisa dicustom customer saat checkout. */
const DEFAULT_COURIER_FEE = 5000;

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const notifications: PageNotification[] = [];
  if (error) notifications.push({ type: "error", message: decodeURIComponent(error) });

  const productId = Number(sp.productId ?? "");
  if (!Number.isInteger(productId) || productId <= 0) redirect("/");

  const quantity = Math.max(1, Number(sp.quantity ?? 1) || 1);
  const durationHours = Math.max(1, Number(sp.durationHours ?? 24) || 24);
  const startDateRaw = Array.isArray(sp.startDate) ? sp.startDate[0] : sp.startDate;
  const start = new Date(startDateRaw ?? new Date().toISOString());
  const end = new Date(start.getTime() + durationHours * 3600_000);
  if (isNaN(start.getTime())) redirect("/");

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true },
    include: {
      units: { select: { id: true, photoPath: true, serialNumber: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const unitPrice = getTierPrice(product, durationHours);
  // Foto produk untuk preview di panel Ringkasan (jalur unit → galeri)
  const { main } = productPhotosOf(product);
  const productImageUrl = main ? storageUrl(main.src) : undefined;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <BackLink href={`/katalog/${product.id}`} label="Kembali ke Produk" className="mb-6" />

      <h1 className="text-xl font-bold tracking-tight md:text-2xl">Checkout</h1>
      <PageNotifier notifications={notifications} />

      <div className="mt-6">
        <CheckoutForm
          itemsJson={JSON.stringify([{ productId, quantity, durationHours }])}
          productId={productId}
          productName={product.name}
          quantity={quantity}
          durationHours={durationHours}
          startIso={start.toISOString()}
          endIso={end.toISOString()}
          unitPrice={unitPrice}
          defaultCourierFee={DEFAULT_COURIER_FEE}
          action={checkoutOrder}
          productImageUrl={productImageUrl}
        />
      </div>
    </div>
  );
}
