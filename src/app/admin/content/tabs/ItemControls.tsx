import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { moveItem, toggleItemActive } from "@/actions/content";

/** Tombol urut + aktif/nonaktif — dipakai semua koleksi konten. */
export function ItemControls({
  collection,
  itemId,
  active,
  isFirst,
  isLast,
}: {
  collection: "heroImage" | "perk" | "testimonial" | "videoContent";
  itemId: number;
  active: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const btn =
    "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30";
  return (
    <div className="flex items-center gap-1">
      <form action={moveItem}>
        <input type="hidden" name="collection" value={collection} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="direction" value="up" />
        <button type="submit" disabled={isFirst} aria-label="Naik" title="Naikkan urutan" className={btn}>
          <ArrowUp className="size-3.5" aria-hidden />
        </button>
      </form>
      <form action={moveItem}>
        <input type="hidden" name="collection" value={collection} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="direction" value="down" />
        <button type="submit" disabled={isLast} aria-label="Turun" title="Turunkan urutan" className={btn}>
          <ArrowDown className="size-3.5" aria-hidden />
        </button>
      </form>
      <form action={toggleItemActive}>
        <input type="hidden" name="collection" value={collection} />
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="active" value={active ? "false" : "true"} />
        <button
          type="submit"
          aria-label={active ? "Sembunyikan" : "Tampilkan"}
          title={active ? "Sembunyikan dari halaman depan" : "Tampilkan di halaman depan"}
          className={btn}
        >
          {active ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
        </button>
      </form>
    </div>
  );
}
