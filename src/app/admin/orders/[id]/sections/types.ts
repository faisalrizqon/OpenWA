import { Prisma } from "@prisma/client";

/** Include yang dipakai query halaman detail order — dibagi agar tipe payload
 *  di page dan tiap section selalu sinkron. */
export const orderDetailInclude = {
  customer: true,
  items: { include: { product: { include: { lateFee: true } }, unit: true } },
  payments: { orderBy: { paidAt: "desc" } },
  returnPhotos: { orderBy: { uploadedAt: "desc" } },
  documents: { orderBy: { uploadedAt: "desc" } },
  handledByUser: { select: { name: true } },
} satisfies Prisma.OrderInclude;

export type OrderDetail = Prisma.OrderGetPayload<{
  include: typeof orderDetailInclude;
}>;
