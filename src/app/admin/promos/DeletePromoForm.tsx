"use client";

import { Button } from "@/components/ui/button";
import { deletePromo } from "@/actions/promos";

/** Form hapus kode promo dengan konfirmasi (butuh client component untuk onSubmit). */
export function DeletePromoForm({ promoId, code }: { promoId: number; code: string }) {
  return (
    <form
      action={deletePromo}
      onSubmit={(e) => {
        if (!window.confirm(`Hapus kode ${code}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="promoId" value={promoId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        Hapus
      </Button>
    </form>
  );
}
