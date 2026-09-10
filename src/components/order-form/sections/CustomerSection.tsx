"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Phone, Search, User, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { phoneDigits } from "@/lib/phone";
import type { CustomerOption } from "../types";

export interface CustomerSectionProps {
  customerId: string;
  setCustomerId: (id: string) => void;
  customers: CustomerOption[];
  selectedCustomer: CustomerOption | undefined;
  newName: string;
  setNewName: (name: string) => void;
  newPhone: string;
  setNewPhone: (phone: string) => void;
  customerValid: boolean;
}

/** Picker pelanggan ala combobox: ketik nama/nomor WA untuk memfilter daftar,
 *  klik untuk memilih. Jauh lebih cepat daripada scroll <select> panjang. */
function CustomerPicker({
  customers,
  customerId,
  setCustomerId,
  selectedCustomer,
}: {
  customers: CustomerOption[];
  customerId: string;
  setCustomerId: (id: string) => void;
  selectedCustomer: CustomerOption | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = phoneDigits(query);
    const list = customers.filter((c) => {
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      if (qDigits.length >= 2 && phoneDigits(c.phone).includes(qDigits)) return true;
      return false;
    });
    return list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [customers, query]);

  const pick = (id: string) => {
    setCustomerId(id);
    setOpen(false);
    setQuery("");
  };

  const closeOnBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!rootRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onBlur={closeOnBlur}>
      {/* Trigger — tampil pelanggan terpilih atau placeholder */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl border border-input bg-background px-3 py-2.5 text-left text-sm shadow-xs transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {selectedCustomer ? (
          <>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate font-medium">{selectedCustomer.name}</span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {selectedCustomer.phone}
              </span>
            </span>
            {selectedCustomer.isBlacklisted && (
              <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                BLACKLIST
              </span>
            )}
          </>
        ) : customerId === "new" ? (
          <>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <UserPlus className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 font-medium">Pelanggan baru</span>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground">Pilih pelanggan…</span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {/* Dropdown dengan search */}
      {open && (
        <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama atau nomor WA…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Bersihkan pencarian"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={customerId === "new"}
                onClick={() => pick("new")}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all duration-200 ${
                  customerId === "new"
                    ? "bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/40"
                    : "hover:bg-muted/60"
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                    customerId === "new"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <UserPlus className="size-4" aria-hidden />
                </span>
                <span className="flex-1">+ Pelanggan baru</span>
                {customerId === "new" && <Check className="size-4" aria-hidden />}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada pelanggan cocok dengan “{query}”.
                <br />
                Pilih &ldquo;+ Pelanggan baru&rdquo; untuk menambahkannya.
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={customerId === String(c.id)}
                    onClick={() => pick(String(c.id))}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all duration-200 ${
                      customerId === String(c.id)
                        ? "bg-primary/10 font-medium text-primary ring-1 ring-inset ring-primary/40"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                        customerId === String(c.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">
                        {c.phone}
                      </span>
                    </span>
                    {c.isBlacklisted && (
                      <span className="shrink-0 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        BLACKLIST
                      </span>
                    )}
                    {customerId === String(c.id) && (
                      <Check className="size-4 shrink-0 text-primary" aria-hidden />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Customer selection section with searchable picker + new-customer inline form. */
export function CustomerSection({
  customerId,
  setCustomerId,
  customers,
  selectedCustomer,
  newName,
  setNewName,
  newPhone,
  setNewPhone,
  customerValid,
}: CustomerSectionProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <User className="size-3.5" aria-hidden />
        </span>
        Pelanggan
      </h2>
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Pilih Pelanggan</Label>
          <CustomerPicker
            customers={customers}
            customerId={customerId}
            setCustomerId={setCustomerId}
            selectedCustomer={selectedCustomer}
          />
          <p className="text-xs text-muted-foreground">
            Ketik nama atau sebagian nomor WA untuk mencari.
          </p>
          {/* Nomor HP pelanggan terpilih — selalu terlihat jelas */}
          {customerId !== "new" && selectedCustomer && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <Phone className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="font-medium">{selectedCustomer.name}</span>
              <span className="font-mono text-muted-foreground">{selectedCustomer.phone}</span>
            </div>
          )}
        </div>
        {customerId === "new" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="newName">Nama Pelanggan Baru</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="mis. Citra"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPhone">Nomor WA Baru</Label>
              <Input
                id="newPhone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="mis. 0851-7956-3295 / +62 851 7956 3295"
              />
              <p className="text-xs text-muted-foreground">
                Format bebas: 08xx, 8xx, 62xx, atau +62 — spasi/tanda baca otomatis dibuang.
              </p>
            </div>
          </>
        )}
      </div>
      {customerId === "new" && newName.trim() && newPhone.trim() && !customerValid && (
        <p className="text-sm text-red-600">
          Nomor WA tidak valid — pastikan 9–14 digit setelah kode negara/awalan 0 dibuang.
        </p>
      )}
      {selectedCustomer?.isBlacklisted && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          ⚠️ Pelanggan ini di-blacklist: {selectedCustomer.name}. Order tidak bisa dibuat.
        </p>
      )}
      {customerId === "new" && (
        <input type="hidden" name="newCustomerName" value={newName} />
      )}
      {customerId === "new" && <input type="hidden" name="newCustomerPhone" value={newPhone} />}
    </section>
  );
}
