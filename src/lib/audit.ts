import type { Prisma, PrismaClient } from "@prisma/client";

type AuditClient = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  entityType: "order" | "product" | "customer" | "unit" | "payment" | "user" | "settings";
  entityId: string;
  action: "create" | "update" | "delete" | "status_change";
  summary: string;
  userId?: string | null;
  detail?: unknown;
}

/** Catat jejak perubahan data. Tidak pernah melempar — audit bersifat pelengkap,
 *  jangan sampai menggagalkan operasi utama. */
export async function logAudit(client: AuditClient, input: AuditInput): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        summary: input.summary,
        userId: input.userId ?? null,
        detail: input.detail == null ? null : JSON.stringify(input.detail),
      },
    });
  } catch (e) {
    console.warn("[audit] gagal mencatat:", e);
  }
}
