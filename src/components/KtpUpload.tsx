"use client";

import { uploadDocument } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function KtpUpload({ customerId }: { customerId: number }) {
  return (
    <form action={uploadDocument} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="space-y-1">
        <Label htmlFor="docType">Jenis Dokumen</Label>
        <select
          id="docType"
          name="docType"
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
          defaultValue="ktp"
        >
          <option value="ktp">KTP</option>
          <option value="selfie_ktp">Selfie + KTP</option>
          <option value="kartu_pelajar">Kartu Pelajar</option>
          <option value="other">Lainnya</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ktp-file">File (JPG/PNG/WebP, maks 5MB)</Label>
        <input
          id="ktp-file"
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
        />
      </div>
      <Button type="submit">Unggah</Button>
    </form>
  );
}
