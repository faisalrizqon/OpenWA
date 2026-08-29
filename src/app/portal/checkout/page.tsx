import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getTierPrice } from "@/lib/pricing";
import { CheckoutForm } from "@/components/CheckoutForm";
import { BackLink } from "@/components/BackLink";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { checkoutOrderPortal } from "@/app/(shop)/actions/checkout";

export const dynamic = "force-dynamic";

/** Ongkos antar default (Rp) — bisa dicustom customer saat checkout. */
const DEFAULT_COURIER_FEE = 5000;

/** Checkout di dalam portal customer — identik dengan halaman publik /checkout,
 *  tetapi tetap berada di area portal (login) dan mem-prefill data customer
 *  yang sudah ada di akun. Setelah berhasil, redirect ke /portal/orders/[nomor]. */
export default async function PortalCheckoutPage({ searchParams }: PageProps<"/portal/checkout">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (!session?.user || session.user.role !== "customer" || !Number.isInteger(customerId) || customerId <= 0) {
    redirect("/portal/login");
  }

  const sp = await searchParams;
  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const notifications: PageNotification[] = [];
  if (error) notifications.push({ type: "error", message: decodeURIComponent(error) });

  const productId = Number(sp.productId ?? "");
  if (!Number.isInteger(productId) || productId <= 0) redirect("/portal/catalog");

  const quantity = Math.max(1, Number(sp.quantity ?? 1) || 1);
  const durationHours = Math.max(1, Number(sp.durationHours ?? 24) || 24);
  const startDateRaw = Array.isArray(sp.startDate) ? sp.startDate[0] : sp.startDate;
  const start = new Date(startDateRaw ?? new Date().toISOString());
  const end = new Date(start.getTime() + durationHours * 3600_000);
  if (isNaN(start.getTime())) redirect("/portal/catalog");

  const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
  if (!product) notFound();

  // Prefill data pemesan dari profil customer yang login
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });

  const unitPrice = getTierPrice(product, durationHours);

  return (
    <div className="space-y-6">
      <BackLink href={`/portal/catalog/${product.id}`} label="Kembali ke Produk" />

      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesanan diproses di dalam portal Anda — data otomatis terisi dari akun.
        </p>
      </div>
      <PageNotifier notifications={notifications} />

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
        action={checkoutOrderPortal}
      />
    </div>
  );
}
