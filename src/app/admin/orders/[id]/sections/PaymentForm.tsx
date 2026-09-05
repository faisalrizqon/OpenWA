"use client";

import { useState } from "react";
import { Check, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { UploadField } from "@/components/UploadField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PAYMENT_TYPES, METHODS } from "./constants";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

const TYPE_OPTIONS = Object.entries(PAYMENT_TYPES).map(([value, label]) => ({ label, value }));
const METHOD_OPTIONS = Object.entries(METHODS).map(([value, label]) => ({ label, value }));

/**
 * Form "Catat Pembayaran".
 *
 * Pembayaran TIDAK langsung dibuat di database — ia masuk daftar draft order dan
 * baru tersimpan setelah tombol "Simpan" di header ditekan. Bila user batal/pergi,
 * pembayaran tidak pernah tercatat.
 */
export function PaymentAddForm() {
  const draft = useOptionalOrderDraft();

  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("dp");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  function resetFields() {
    setAmount("");
    setPaymentType("dp");
    setMethod("");
    setNote("");
    setProofFile(null);
    setError("");
  }

  function recordToDraft() {
    if (!draft) return;
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Jumlah harus angka lebih dari 0.");
      return;
    }
    if (!(paymentType in PAYMENT_TYPES)) {
      setError("Pilih jenis pembayaran yang valid.");
      return;
    }
    draft.addPayment({
      amount: parsed,
      paymentType,
      method: method || undefined,
      note: note.trim() || undefined,
      proof: proofFile,
    });
    resetFields();
  }

  // Tanpa provider draft tidak ada jalur simpan → jangan tampilkan form.
  if (!draft) return null;

  // Tampilkan antrian pembayaran yang belum disimpan agar user tahu apa yang pending.
  const staged = draft.paymentsToAdd;

  return (
    <div className="mb-6 space-y-3">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="pay-amount" className="text-xs font-medium text-muted-foreground">
            Jumlah (Rp)
          </Label>
          <input
            id="pay-amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError("");
            }}
            placeholder="30000"
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pay-type" className="text-xs font-medium text-muted-foreground">
            Jenis
          </Label>
          <SelectField
            id="pay-type"
            value={paymentType}
            onValueChange={setPaymentType}
            options={TYPE_OPTIONS}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pay-method" className="text-xs font-medium text-muted-foreground">
            Metode
          </Label>
          <SelectField
            id="pay-method"
            value={method}
            onValueChange={setMethod}
            options={METHOD_OPTIONS}
            placeholder="— pilih metode —"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pay-note" className="text-xs font-medium text-muted-foreground">
            Catatan
          </Label>
          <input
            id="pay-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>

        <div className="sm:col-span-2">
          <UploadField
            id="pay-proof"
            name="proof"
            compact
            placeholder="Bukti transfer / QRIS (opsional)…"
            helper="Semua format diterima, maks 15MB (dikompres otomatis)."
            onFilesChange={(files) => setProofFile(files[0] ?? null)}
          />
        </div>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={recordToDraft} className="gap-1.5">
          <Wallet className="size-4" aria-hidden />
          Catat Pembayaran
        </Button>
        {staged.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={resetFields} className="gap-1.5">
            <RotateCcw className="size-3.5" aria-hidden />
            Kosongkan isian
          </Button>
        )}
      </div>

      {/* Daftar pembayaran yang masih menunggu tombol Simpan */}
      {staged.length > 0 && (
        <ul className="space-y-1.5 rounded-lg border border-dashed bg-muted/30 p-3">
          <li className="text-xs font-semibold text-muted-foreground">
            Menunggu disimpan ({staged.length}) — tekan <strong>Simpan</strong> di atas halaman
          </li>
          {staged.map((p, i) => (
            <li key={`${p.paymentType}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-600" aria-hidden />
                {PAYMENT_TYPES[p.paymentType] ?? p.paymentType} · Rp{" "}
                {p.amount.toLocaleString("id-ID")}
                {p.proof ? " · +bukti" : ""}
              </span>
              <button
                type="button"
                aria-label={`Batalkan pembayaran ${PAYMENT_TYPES[p.paymentType] ?? p.paymentType}`}
                onClick={() => draft.removePendingPayment(i)}
                className="text-xs text-muted-foreground underline hover:text-red-600"
              >
                urungkan
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Saran denda keterlambatan — mencatat pembayaran "denda" ke draft, bukan
 * langsung ke database. Nominal & jumlah hari mengikuti hitungan server.
 */
export function LateFeeDraftButton({
  suggestedFine,
  lateDays,
}: {
  suggestedFine: number;
  lateDays: number;
}) {
  const draft = useOptionalOrderDraft();
  if (!draft) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        draft.addPayment({
          amount: suggestedFine,
          paymentType: "denda",
          note: `Denda keterlambatan ${lateDays} hari (sistem)`,
          proof: null,
        })
      }
    >
      Catat Denda Ini
    </Button>
  );
}
