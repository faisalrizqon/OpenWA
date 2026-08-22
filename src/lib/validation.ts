import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().optional(),
  price6h: z.coerce.number().nonnegative(),
  price12h: z.coerce.number().nonnegative(),
  price24h: z.coerce.number().nonnegative(),
  price48h: z.coerce.number().nonnegative(),
  stockThreshold: z.coerce.number().int().min(1).default(1),
  initialUnits: z.coerce.number().int().min(1).default(1),
});
