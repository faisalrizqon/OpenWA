"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rejectPayment } from "@/actions/payments";

/** Form inline untuk menolak bukti pembayaran dengan alasan opsional. */
export function RejectPaymentForm({ paymentId }: { paymentId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <X className="size-3.5" aria-hidden />
        Tolak
      </Button>
    );
  }

  return (
    <form action={rejectPayment} className="flex w-full items-center gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Alasan penolakan (opsional)"
        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
      />
      <Button type="submit" variant="destructive" size="sm">
        Tolak
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Batal
      </Button>
    </form>
  );
}
