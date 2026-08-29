"use client";

import { User, Phone } from "lucide-react";
import { SelectField } from "@/components/SelectField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/** Customer selection section with new-customer inline form. */
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customerId">Pilih Pelanggan</Label>
          <SelectField
            id="customerId"
            name="customerId"
            value={customerId}
            onValueChange={setCustomerId}
            options={[
              ...customers.map((c) => ({
                label: `${c.name} (${c.phone})${c.isBlacklisted ? " — BLACKLIST" : ""}`,
                value: String(c.id),
              })),
              { label: "+ Pelanggan baru", value: "new" },
            ]}
          />
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
                placeholder="08xxx"
              />
            </div>
          </>
        )}
      </div>
      {customerId === "new" && newName.trim() && newPhone.trim() && !customerValid && (
        <p className="text-sm text-red-600">
          Nomor WA tidak valid — format 08xxx (9–14 digit).
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
