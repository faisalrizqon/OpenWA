"use client";

import * as React from "react";
import { ShieldCheck, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { UploadField } from "@/components/UploadField";
import { SelectField } from "@/components/SelectField";

export const DOC_LABELS: Record<string, string> = {
  ktp: "KTP",
  kartu_pelajar: "Kartu Pelajar",
  selfie_ktp: "Selfie Identitas",
  other: "Lainnya",
};

export interface GuaranteeDoc {
  id: number;
  docType: string;
  filePath: string;
  fileSize: number;
  uploadedAt: Date;
}

/**
 * Daftar dokumen jaminan terupload (klik untuk zoom) + tombol ✕ per dokumen
 * untuk revisi bila salah upload — jaminan bersifat opsional (pelengkap data).
 */
export function GuaranteeDocs({
  orderId,
  documents,
  back,
  columns = "grid-cols-2 sm:grid-cols-4",
  allowDelete = true,
}: {
  orderId: string;
  documents: GuaranteeDoc[];
  /** Halaman kembali setelah hapus (mis. /admin/orders/<id>). */
  back?: string;
  columns?: string;
  /** Set false untuk menyembunyikan tombol hapus per-foto. */
  allowDelete?: boolean;
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
          {/* Klik gambar → zoom di modal (bukan buka tab baru) */}
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label={`Perbesar ${DOC_LABELS[d.docType] ?? "dokumen"}`}
                  className="block w-full cursor-zoom-in"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={storageUrl(d.filePath)}
                    alt={DOC_LABELS[d.docType] ?? d.docType}
                    className="h-24 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-80"
                  />
                </button>
              }
            />
            <DialogContent className="max-w-5xl sm:max-w-5xl">
              <DialogHeader>
                <DialogTitle>{DOC_LABELS[d.docType] ?? "Dokumen Jaminan"}</DialogTitle>
                <DialogDescription>Klik di luar atau tekan ESC untuk menutup</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center bg-muted p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={storageUrl(d.filePath)}
                  alt={DOC_LABELS[d.docType] ?? d.docType}
                  className="max-h-[75vh] max-w-full object-contain"
                />
              </div>
            </DialogContent>
          </Dialog>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {DOC_LABELS[d.docType] ?? d.docType}
          </p>
          {allowDelete && (
            /* Tombol hapus (X) — konfirmasi dialog sebelum delete */
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
          )}
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
  const [idDocType, setIdDocType] = React.useState("ktp");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="back" value={back ?? ""} />

      {/* Layout sejajar: dua kolom upload berdampingan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Kolom kiri: KTP / kartu pelajar */}
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">Dokumen Identitas</p>
            <p className="text-xs text-muted-foreground">Pilih jenis dokumen yang akan diupload.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="docType">Tipe dokumen</Label>
            <SelectField
              id="docType"
              name="docType"
              value={idDocType}
              onValueChange={setIdDocType}
              options={[
                { label: "KTP", value: "ktp" },
                { label: "Kartu Pelajar", value: "kartu_pelajar" },
              ]}
              triggerClassName="h-8 text-xs"
            />
          </div>
          <div className="mt-auto space-y-1.5">
            <Label htmlFor="fileId">Foto identitas ({DOC_LABELS[idDocType]})</Label>
            <UploadField
              id="fileId"
              name="file"
              required
              placeholder={DOC_LABELS[idDocType] === "KTP" ? "Upload foto KTP..." : "Upload kartu pelajar..."}
            />
          </div>
        </div>

        {/* Kolom kanan: selfie identitas */}
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground">
              Selfie Identitas{" "}
              <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 align-middle text-[10px] font-semibold text-red-700">
                Wajib
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Wajib diupload sebagai bukti diri.</p>
          </div>
          <div className="mt-auto space-y-1.5">
            <Label htmlFor="fileSelfie">Foto selfie wajah</Label>
            <UploadField
              id="fileSelfie"
              name="selfie"
              required
              placeholder="Upload selfie wajah (wajib)..."
            />
          </div>
        </div>
      </div>
      <Button type="submit" className="h-10 w-full gap-1.5">
        <ShieldCheck className="size-4" aria-hidden />
        Upload Jaminan
      </Button>
    </form>
  );
}
