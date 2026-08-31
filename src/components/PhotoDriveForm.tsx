"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { DriveIcon } from "@/components/DriveIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePhotoLink } from "@/app/(shop)/actions/checkout";

/**
 * Form admin/mitra untuk menyimpan link Google Drive berisi foto hasil sewa.
 * Menyimpan tanpa redirect — halaman tetap sama (memperbaiki bug "keluar tab").
 * Kirim tanpa nilai (button Hapus) untuk mengosongkan link.
 */
export function PhotoDriveForm({
  orderId,
  initialLink,
}: {
  orderId: string;
  initialLink?: string | null;
}) {
  const [link, setLink] = React.useState(initialLink ?? "");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedMessage, setSavedMessage] = React.useState("");

  const save = async (value: string) => {
    if (saving) return;
    setError("");
    setSavedMessage("");
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("photoLink", value);

      const result = await savePhotoLink(formData);
      if (result.ok) {
        setSavedMessage(value ? "Link Drive berhasil disimpan." : "Link Drive berhasil dihapus.");
        setTimeout(() => setSavedMessage(""), 3000);
      } else {
        setError(result.error ?? "Gagal menyimpan link.");
      }
    } catch {
      setError("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setLink("");
    await save("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/drive/folders/…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setError("");
          }}
        />
      </div>

      {initialLink && (
        <div className="flex items-center justify-between">
          <a
            href={initialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <DriveIcon className="size-3.5" />
            Buka folder Drive saat ini
          </a>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={saving}
            className="h-7 gap-1.5 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Hapus link
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {savedMessage && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {savedMessage}
        </p>
      )}
    </div>
  );
}
