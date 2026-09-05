"use client";

import { useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadField } from "@/components/UploadField";
import { SelectField } from "@/components/SelectField";
import { storageUrl } from "@/lib/storage-url";
import { DOC_LABELS } from "@/components/GuaranteeUpload";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";
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

/** Card Jaminan di halaman detail order admin — perubahan masuk DRAFT.
 *  Klik gambar untuk memperbesar, klik ✕ untuk menghapus dokumen terupload,
 *  atau upload baru untuk menambah. Semua perubahan tersimpan setelah tombol
 *  "Simpan" di header ditekan. */
export function GuaranteeSection({
  order,
}: {
  order: {
    id: string;
    documents: Array<{
      id: number;
      docType: string;
      filePath: string;
      fileSize: number;
      uploadedAt: Date;
    }>;
  };
}) {
  const draft = useOptionalOrderDraft();
  const [docType, setDocType] = useState<string>("ktp");
  const [file, setFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  if (!draft) return null;

  const pendingDeleteIds = new Set(draft.guaranteeDocsToDelete);
  const hasPendingNew = draft.guaranteeDocType || draft.guaranteeFile || draft.guaranteeSelfie;

  function stageToDraft() {
    if (!draft) return;
    // Gabungkan file baru dengan yang sudah ada di draft (jika user upload bertahap).
    const nextFile = file ?? draft.guaranteeFile;
    const nextSelfie = selfie ?? draft.guaranteeSelfie;
    draft.setGuarantee({ docType, file: nextFile, selfie: nextSelfie });
    // Reset input form setelah diterapkan ke draft.
    setFile(null);
    setSelfie(null);
  }

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Jaminan</CardTitle>
        <CardDescription>
          KTP / selfie identitas / kartu pelajar sebagai pelengkap data order ini.
          Klik gambar untuk memperbesar atau klik ✕ untuk menghapus (revisi).
          Perubahan masuk DRAFT dan baru tersimpan setelah tombol{" "}
          <strong>Simpan</strong> di atas halaman ditekan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto px-3 py-3 sm:px-6 sm:py-4">
        {/* Dokumen jaminan existing (kecuali yang ditandai hapus) + draft baru */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Tampilkan dokumen terupload yang belum ditandai hapus */}
          {order.documents.map((doc) => {
            if (pendingDeleteIds.has(doc.id)) return null;
            const label = DOC_LABELS[doc.docType] ?? doc.docType;
            return (
              <div key={doc.id} className="group relative">
                {/* Klik gambar → zoom di modal */}
                <Dialog>
                  <DialogTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Perbesar ${label}`}
                        className="block w-full cursor-zoom-in"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storageUrl(doc.filePath)}
                          alt={label}
                          className="h-24 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-80"
                        />
                      </button>
                    }
                  />
                  <DialogContent className="max-w-5xl sm:max-w-5xl">
                    <DialogHeader>
                      <DialogTitle>{label}</DialogTitle>
                      <DialogDescription>Klik di luar atau tekan ESC untuk menutup</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center bg-muted p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storageUrl(doc.filePath)}
                        alt={label}
                        className="max-h-[75vh] max-w-full object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
                <p className="mt-1 truncate pr-6 text-xs text-muted-foreground">{label}</p>
                {/* Tombol hapus (✕) — konfirmasi dialog, tandai ke draft */}
                <Dialog>
                  <DialogTrigger
                    render={
                      <button
                        type="button"
                        aria-label={`Tandai hapus ${label}`}
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
                        {label} jaminan ditandai untuk dihapus — penghapusan baru
                        terjadi setelah Anda menekan tombol <strong>Simpan</strong>{" "}
                        di atas halaman.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose
                        render={<Button type="button" variant="outline">Batal</Button>}
                      />
                      <DialogClose
                        render={
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => draft.deleteGuaranteeDoc(doc.id)}
                          >
                            Tandai Hapus
                          </Button>
                        }
                      />
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}

          {/* Preview dokumen draft baru (belum tersimpan) — juga bisa di-zoom */}
          {draft.guaranteeFile && (
            <div className="group relative">
              <Dialog>
                <DialogTrigger
                  render={
                    <button type="button" aria-label="Perbesar dokumen draft" className="block w-full cursor-zoom-in">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(draft.guaranteeFile)}
                        alt="Dokumen identitas (draft)"
                        className="h-24 w-full rounded-lg border border-dashed object-cover opacity-90 transition-opacity group-hover:opacity-80"
                      />
                    </button>
                  }
                />
                <DialogContent className="max-w-5xl sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>{DOC_LABELS[draft.guaranteeDocType ?? "ktp"] ?? "Dokumen"} (Draft)</DialogTitle>
                    <DialogDescription>Belum tersimpan — tekan Simpan di atas halaman.</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-center bg-muted p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(draft.guaranteeFile)}
                      alt="Dokumen identitas (draft)"
                      className="max-h-[75vh] max-w-full object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <p className="mt-1 truncate pr-6 text-xs text-muted-foreground">
                {DOC_LABELS[draft.guaranteeDocType ?? "ktp"] ?? "Dokumen"} (Draft)
              </p>
              <button
                type="button"
                onClick={() =>
                  draft.setGuarantee({
                    docType: draft.guaranteeDocType || "ktp",
                    file: null,
                    selfie: draft.guaranteeSelfie,
                  })
                }
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/95 text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Buang dokumen identitas draft"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
          {draft.guaranteeSelfie && (
            <div className="group relative">
              <Dialog>
                <DialogTrigger
                  render={
                    <button type="button" aria-label="Perbesar selfie draft" className="block w-full cursor-zoom-in">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(draft.guaranteeSelfie)}
                        alt="Selfie (draft)"
                        className="h-24 w-full rounded-lg border border-dashed object-cover opacity-90 transition-opacity group-hover:opacity-80"
                      />
                    </button>
                  }
                />
                <DialogContent className="max-w-5xl sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Selfie Identitas (Draft)</DialogTitle>
                    <DialogDescription>Belum tersimpan — tekan Simpan di atas halaman.</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-center bg-muted p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(draft.guaranteeSelfie)}
                      alt="Selfie (draft)"
                      className="max-h-[75vh] max-w-full object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <p className="mt-1 truncate pr-6 text-xs text-muted-foreground">Selfie (Draft)</p>
              <button
                type="button"
                onClick={() =>
                  draft.setGuarantee({
                    docType: draft.guaranteeDocType || "ktp",
                    file: draft.guaranteeFile,
                    selfie: null,
                  })
                }
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/95 text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label="Buang selfie jaminan draft"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
        </div>

        {order.documents.length === 0 && !hasPendingNew && (
          <p className="text-sm text-muted-foreground">
            Belum ada jaminan terupload. Dokumen jaminan bersifat{" "}
            <span className="font-medium text-foreground">opsional</span> — cukup sebagai
            pelengkap data order.
          </p>
        )}

        {/* Form upload jaminan baru ke draft — layout dua kolom seperti form order */}
        <div className="flex min-h-[315px] flex-col rounded-xl border bg-muted/30 p-4">
          <p className="mb-3 text-sm font-semibold">Tambah dokumen jaminan</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Kolom kiri: dokumen identitas */}
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
                  value={docType}
                  onValueChange={setDocType}
                  options={[
                    { label: "KTP", value: "ktp" },
                    { label: "Kartu Pelajar", value: "kartu_pelajar" },
                  ]}
                  triggerClassName="h-8 text-xs"
                />
              </div>
              <div className="mt-auto space-y-1.5">
                <Label htmlFor="fileId">Foto identitas ({DOC_LABELS[docType]})</Label>
                <UploadField
                  id="fileId"
                  name="file"
                  placeholder={docType === "ktp" ? "Upload foto KTP..." : "Upload kartu pelajar..."}
                  onFilesChange={(files) => setFile(files[0] ?? null)}
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
                  placeholder="Upload selfie wajah (wajib)..."
                  onFilesChange={(files) => setSelfie(files[0] ?? null)}
                />
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant={!file && !selfie ? "outline" : "default"}
            size="sm"
            disabled={!draft || (!file && !selfie)}
            onClick={stageToDraft}
            className="mt-auto h-10 w-full gap-1.5"
          >
            <ShieldCheck className="size-4" aria-hidden />
            Terapkan ke Draft
          </Button>
          {hasPendingNew && (
            <p className="mt-2 text-xs text-muted-foreground">
              Dokumen akan tersimpan saat tombol <strong>Simpan</strong> di atas halaman ditekan.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
