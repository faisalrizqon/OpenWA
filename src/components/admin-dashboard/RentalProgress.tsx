import { format, differenceInMinutes } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TodayRental } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { formatSisaWaktu } from "./utils";

/**
 * Progress bar sewa — posisi sekarang dalam masa sewa (0–100%)
 * dengan penanda mulai/kembali + sisa waktu.
 */
export function RentalProgress({ rental }: { rental: TodayRental }) {
  const now = new Date();
  const isOverdue = now > rental.endDate;
  const isLate = rental.status === "late" || isOverdue;
  const minutesLeft = differenceInMinutes(rental.endDate, now);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
        <span>
          {format(rental.startDate, "dd MMMM HH:mm", { locale: localeId })} →{" "}
          {format(rental.endDate, "dd MMMM HH:mm", { locale: localeId })}
        </span>
        <span
          className={cn(
            "font-semibold",
            isOverdue ? "text-red-600" : isLate ? "text-amber-600" : "text-foreground"
          )}
        >
          {isOverdue
            ? `Lewat ${formatSisaWaktu(-minutesLeft)}`
            : `Sisa ${formatSisaWaktu(minutesLeft)}`}{" "}
          · {rental.progress}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            isLate
              ? "from-red-500 to-red-400"
              : rental.progress >= 100
                ? "from-amber-500 to-amber-400"
                : "from-primary to-primary/70"
          )}
          style={{ width: `${Math.min(100, rental.progress)}%` }}
        />
      </div>
    </div>
  );
}
