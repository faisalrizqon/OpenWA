<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mudahsewa-ui-conventions -->

# UI Conventions — Picker / Dropdown (WAJIB diikuti)

Style name: **`picker-standar`**

Semua picker/dropdown di app ini WAJIB pakai komponen **shadcn/ui Select (Base UI)** dari
`@/components/ui/select` — JANGAN pakai native `<select>` browser (popup ikut dark mode OS).

Pola `picker-standar`:

```tsx
<Select value={value} onValueChange={handle} items={options}>
  <SelectTrigger className="h-8 w-full min-w-[180px] sm:w-auto">
    <SelectValue placeholder="…" />
  </SelectTrigger>
  <SelectContent align="start" className="min-w-[180px] rounded-xl p-1">
    {options.map((o) => (
      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Rules:
1. Trigger: `h-8 rounded-lg border-input bg-card` — tinggi compact (toolbar) atau `h-9` (form).
2. Popup: `rounded-xl p-1`, `align="start"`, dan `min-w` popup HARUS sama dengan `min-w` trigger
   (standar: `min-w-[180px]`) supaya lebar popup ≥ trigger dan teks tidak terpotong.
3. Checkmark item terpilih otomatis dari `SelectItem` (ItemIndicator bawaan).
4. Untuk form native (server action), pakai wrapper `SelectField` dari `@/components/SelectField`
   (post via hidden input `name`).
5. Value kosong tidak boleh `""` di Base UI Select — pakai token seperti `"all"`,
   lalu convert balik di handler.
6. Warna item highlight mengikuti tema default (`focus:bg-accent`), jangan override ke warna
   lain kecuali diminta.
7. **Responsive pattern**: `w-full min-w-[180px] sm:w-auto` agar full-width di mobile, tapi
   shrink-to-content di desktop toolbar agar compact dan rapi.

Referensi implementasi: `src/components/CalendarProductFilter.tsx`,
`src/components/OrderAdminActions.tsx` (picker status order).

<!-- END:mudahsewa-ui-conventions -->

<!-- BEGIN:mudahsewa-domain-conventions -->

# Domain Conventions — Stok & Server Action (WAJIB diikuti)

## Cek stok unit

SATU sumber kebenaran logika ketersediaan stok: `src/lib/availability.ts`.
JANGAN menulis ulang query `unit.count` + `orderItem.findMany` + overlap manual.

- `getStockSnapshot({ client, productId, rangeStart, rangeEnd })` → return
  `{ product, totalUnits, busy, available, restBufferHours }`. Dipakai kalau
  butuh angkanya (API, UI).
- `ensureStockAvailable({ ..., needed })` → throw Error user-facing bila stok
  kurang. Dipakai di server action (createOrder, extendOrder, checkout).
- Keduanya menerima `client: PrismaClient | Prisma.TransactionClient` —
  panggil di dalam `prisma.$transaction(async (tx) => ...)` dengan `client: tx`.
- Semua cek stok WAJIB memperhitungkan `Product.chargingRestHours` (jeda charge
  & istirahat unit setelah kembali, default 3 jam). Helper sudah menanganinya.
- Order `pending` tidak mengunci stok; hanya `booking | active | late`.

## Server action — redirect error

Kecelakaan lama: action redirect ke halaman ber-param tanpa membawa param-nya,
lalu halaman itu `redirect("/")` → user terlempar ke landing page.

Rules:
1. Redirect error dari server action WAJIB membawa kembali SEMUA param yang
   dibutuhkan halaman target (contoh: `failCheckout()` di
   `src/app/(shop)/actions/checkout.ts` mempertahankan productId/quantity/
   durationHours/startDate).
2. Helper redirect-error yang selalu berakhir dengan `redirect()` diberi return
   type `: never` supaya TypeScript men-narrow variabel setelahnya.
3. Validasi input yang gagal di action → redirect balik ke form asal dengan
   `?error=<pesan>`, jangan pernah ke `/` kecuali memang tidak ada konteks.

## Git hygiene

Setiap kali selesai fitur/fix yang berfungsi: **commit** dengan pesan
konvensional (`feat:`, `fix:`, `refactor:`). Jangan menumpuk perubahan besar
tanpa commit — recovery lewat `git stash` di repo dengan file DB biner rawan
konflik. Jangan pernah `git stash` / `git checkout -- .` saat dev server aktif
(mengunci `data/mudahsewa.db`).

<!-- END:mudahsewa-domain-conventions -->
