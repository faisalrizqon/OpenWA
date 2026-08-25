"use client";

import * as React from "react";
import { ShieldCheck, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { storageUrl } from "@/lib/storage-url";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteGuarantee } from "@/app/(shop)/actions/checkout";

const DOC_OPTIONS = [
  { label: "KTP", value: "ktp" },
  { label: "Selfie + KTP", value: "selfie_ktp" },
  { label: "Kartu Pelajar", value: "kartu_pelajar" },
  { label: "Lainnya", value: "other" },
];

export const DOC_LABELS: Record<string, string> = {
  ktp: "KTP",
  selfie_ktp: "Selfie KTP",
  kartu_pelajar: "Kartu Pelajar",
  other: "Lainnya",
};

export interface GuaranteeDoc {
  id: number;
  docType: string;
  filePath: string;
}

/**
 * Daftar dokumen jaminan terupload + tombol hapus (X) dengan dialog konfirmasi.
 * Jaminan bersifat opsional (pelengkap data), jadi dokumen boleh dihapus
 * untuk revisi bila salah upload.
 */
export function GuaranteeDocs({
  orderId,
  documents,
  back,
  columns = "grid-cols-2 sm:grid-cols-4",
}: {
  orderId: string;
  documents: GuaranteeDoc[];
  /** Halaman kembali setelah hapus (mis. /admin/orders/<id>). */
  back?: string;
  columns?: string;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada jaminan terupload. Dokumen jaminan bersifat{" "}
        <span className="font-medium text-foreground">opsional</span> — cukup
        sebagai pelengkap data order.
      </p>
    );
  }

  return (
    <div className={`grid gap-3 ${columns}`}>
      {documents.map((d) => (
        <div key={d.id} className="group relative">
          <a
            href={storageUrl(d.filePath)}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storageUrl(d.filePath)}
              alt={DOC_LABELS[d.docType] ?? d.docType}
              className="h-24 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-80"
            />
          </a>
          <p className="mt-1 truncate pr-6 text-xs text-muted-foreground">
            {DOC_LABELS[d.docType] ?? d.docType}
          </p>
          {/* Tombol hapus (X) — konfirmasi dialog sebelum delete */}
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label={`Hapus ${DOC_LABELS[d.docType] ?? "dokumen"}`}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/95 text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hapus dokumen ini?</DialogTitle>
                <DialogDescription>
                  {DOC_LABELS[d.docType] ?? "Dokumen"} jaminan akan dihapus
                  permanen. Gunakan ini untuk revisi bila salah upload — kamu
                  bisa upload ulang setelahnya.
                </DialogDescription>
              </DialogHeader>
              <form action={deleteGuarantee}>
                <input type="hidden" name="documentId" value={d.id} />
                <input type="hidden" name="orderId" value={orderId} />
                {back && <input type="hidden" name="back" value={back} />}
                <DialogFooter>
                  <DialogClose
                    render={<Button type="button" variant="outline">Batal</Button>}
                  />
                  <Button type="submit" variant="destructive">
                    Ya, Hapus
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}

/**
 * Form upload dokumen jaminan. Jaminan bersifat opsional — KTP / selfie KTP /
 * kartu pelajar hanya pelengkap data order.
 */
export function GuaranteeUpload({
  orderId,
  action,
  back,
}: {
  orderId: string;
  action: (formData: FormData) => void;
  /** Halaman kembali setelah upload (mis. /admin/orders/<id>). */
  back?: string;
}) {
  const [fileName, setFileName] = React.useState("");
  const [docType, setDocType] = React.useState("ktp");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="docType" value={docType} />
      {back && <input type="hidden" name="back" value={back} />}

      <div className="space-y-1.5">
        <Label htmlFor="docType">Jenis jaminan (opsional)</Label>
        <SelectField
          id="docType"
          value={docType}
          onValueChange={setDocType}
          options={DOC_OPTIONS}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="guaranteeFile">Foto dokumen</Label>
        <label
          htmlFor="guaranteeFile"
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-3 text-sm transition-colors hover:bg-accent"
        >
          <Upload className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            {fileName || "Pilih foto KTP / kartu pelajar…"}
          </span>
        </label>
        <input
          id="guaranteeFile"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        <p className="text-xs text-muted-foreground">
          JPG/PNG/WebP, maksimal 5 MB. Dokumen jaminan hanya pelengkap data —
          bila salah upload, hapus lewat tombol ✕ pada dokumen lalu upload ulang.
        </p>
      </div>

      <Button type="submit" className="h-10 w-full gap-1.5">
        <ShieldCheck className="size-4" aria-hidden />
        Upload Jaminan
      </Button>
    </form>
  );
}
