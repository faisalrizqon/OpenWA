"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DriveIcon } from "@/components/DriveIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOptionalOrderDraft } from "./order-draft/OrderDraftContext";

export function PhotoDriveForm({ initialLink }: { initialLink?: string | null }) {
  const draft = useOptionalOrderDraft();
  
  const staged = draft?.details?.photoLink;
  const [link, setLink] = useState(staged !== undefined ? (staged ?? "") : (initialLink ?? ""));
  const [error, setError] = useState("");

  if (!draft) return null;

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const applyToDraft = () => {
    if (!draft) return;
    const trimmed = link.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setError("Link tidak valid — masukkan URL lengkap (diawali http/https).");
      return;
    }
    draft.setDetails({ photoLink: trimmed || null });
    setError("");
  };

  const handleDelete = () => {
    if (!draft) return;
    setLink("");
    draft.setDetails({ photoLink: null });
    setError("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="https://drive.google.com/drive/folders/…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setError("");
          }}
          onBlur={applyToDraft}
          aria-label="Link Google Drive foto hasil sewa"
        />
        {link && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Hapus link Drive"
          >
            <Trash2 className="size-3.5" aria-hidden />
          </Button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        Link tersimpan setelah menekan tombol{" "}
        <strong>Simpan Perubahan</strong> di atas halaman.
      </p>
    </div>
  );
}
