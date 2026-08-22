const statusMap: Record<string, { label: string; className: string }> = {
  booking: { label: "Booking", className: "bg-yellow-100 text-yellow-800" },
  active: { label: "Aktif", className: "bg-blue-100 text-blue-800" },
  late: { label: "Terlambat", className: "bg-red-100 text-red-800" },
  completed: { label: "Selesai", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Dibatalkan", className: "bg-gray-100 text-gray-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] ?? { label: status, className: "bg-gray-100 text-gray-800" };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${s.className}`}
    >
      {s.label}
    </span>
  );
}
