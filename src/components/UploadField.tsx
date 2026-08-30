"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";

/**
 * Kolom upload file seragam: kotak dashed + input tersembunyi + chip file
 * terpilih (bisa dihapus per file). Dipakai di upload jaminan & foto return.
 *
 * Akumulasi file disimpan di state lalu disinkronkan terus ke input lewat
 * DataTransfer, sehingga file yang dipilih (dan belum dihapus) benar-benar
 * ikut terkirim bersama form.
 */
export function UploadField({
  id,
  name,
  multiple = false,
  required = false,
  placeholder = "Pilih file…",
  helper,
}: {
  id: string;
  name: string;
  multiple?: boolean;
  required?: boolean;
  placeholder?: string;
  helper?: string;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sinkronkan state → input setiap kali berubah, agar FormData submit
  // selalu berisi daftar file terkini.
  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
  }, [files]);

  const addFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setFiles((prev) =>
      multiple ? [...prev, ...Array.from(picked)] : Array.from(picked).slice(-1)
    );
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-3 text-sm transition-colors hover:bg-accent"
      >
        <Upload className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">
          {files.length > 0
            ? multiple
              ? `${files.length} foto dipilih — klik untuk menambah`
              : files[0].name
            : placeholder}
        </span>
      </label>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        multiple={multiple}
        required={required}
        accept="*/*"
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
      {/* Chip preview + hapus per file terpilih (sebelum submit) */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex max-w-44 items-center gap-1.5 rounded-lg border bg-card px-2 py-1 text-xs"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Hapus ${f.name} dari pilihan`}
                onClick={() => removeFile(i)}
                className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
