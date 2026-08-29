"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/actions/reviews";

/** Form rating bintang + teks opsional untuk order selesai. */
export function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);

  return (
    <form action={submitReview} className="mt-3 space-y-3 rounded-xl bg-accent/30 p-4">
      <input type="hidden" name="orderId" value={orderId} />

      <p className="text-sm font-medium">Puas dengan sewanya? Kasih review yuk! ⭐</p>

      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`Beri ${n} bintang`}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`size-6 ${
                n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
              }`}
              aria-hidden
            />
          </button>
        ))}
      </div>

      {/* Rating dikirim via hidden input supaya ikut submit */}
      <input type="hidden" name="rating" value={rating || ""} />

      <textarea
        name="text"
        placeholder="Ceritakan pengalamanmu (opsional)…"
        rows={2}
        maxLength={500}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <Button type="submit" size="sm" disabled={rating === 0}>
        Kirim Review
      </Button>
    </form>
  );
}
