"use client";

import { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CardEditDialogProps {
  /** Judul card — dipakai sebagai label aksesibel tombol edit. */
  title: string;
  /** Judul dialog (default: "Edit {title}"). */
  editTitle?: string;
  /** Deskripsi singkat di header dialog. */
  editDescription?: string;
  /** Form edit (client) yang tampil di dalam dialog. */
  editForm: ReactNode;
}

/** Tombol edit ikon pensil di pojok kanan atas card → membuka dialog overlay
 *  berisi form edit. Submit form (server action) me-redirect & menutup dialog
 *  otomatis karena halaman re-render. */
export function CardEditDialog({
  title,
  editTitle,
  editDescription,
  editForm,
}: CardEditDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 shrink-0 p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label={`Edit ${title}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      />
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editTitle ?? `Edit ${title}`}</DialogTitle>
          {editDescription && <DialogDescription>{editDescription}</DialogDescription>}
        </DialogHeader>
        <div className="mt-4">
          {editForm}
        </div>
      </DialogContent>
    </Dialog>
  );
}
