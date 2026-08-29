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
  // Jeda charge & istirahat unit setelah rental selesai (jam)
  chargingRestHours: z.coerce.number().int().min(0).max(24).default(3),
  initialUnits: z.coerce.number().int().min(1).optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(9).regex(/^0\d{8,13}$/),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});
