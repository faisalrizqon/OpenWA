"use client";

import { Upload } from "lucide-react";
import { uploadDocument } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";

export function KtpUpload({ customerId }: { customerId: number }) {
  return (
    <form action={uploadDocument} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="w-44 space-y-1">
        <Label htmlFor="docType">Jenis Dokumen</Label>
        <SelectField
          id="docType"
          name="docType"
          defaultValue="ktp"
          options={[
            { label: "KTP", value: "ktp" },
            { label: "Selfie + Identitas", value: "selfie_ktp" },
            { label: "Kartu Pelajar", value: "kartu_pelajar" },
            { label: "Lainnya", value: "other" },
          ]}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ktp-file">File (maks 15MB, dikompres otomatis)</Label>
        <input
          id="ktp-file"
          name="file"
          type="file"
          required
          accept="*/*"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-foreground hover:file:bg-accent/80"
        />
      </div>
      <Button type="submit" variant="secondary" className="gap-1.5">
        <Upload className="size-4" aria-hidden />
        Unggah
      </Button>
    </form>
  );
}
