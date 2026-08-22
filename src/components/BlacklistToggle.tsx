"use client";

import { useState } from "react";
import { setBlacklist } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

export function BlacklistToggle({
  customerId,
  isBlacklisted,
}: {
  customerId: number;
  isBlacklisted: boolean;
}) {
  if (!isBlacklisted) {
    return (
      <Dialog>
        <DialogTrigger render={<Button variant="destructive">Blacklist</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist pelanggan ini?</DialogTitle>
            <DialogDescription>
              Tulis alasan (wajib, min. 3 karakter). Pelanggan blacklist tidak bisa
              membuat order baru.
            </DialogDescription>
          </DialogHeader>
          <form action={setBlacklist} className="space-y-3">
            <input type="hidden" name="id" value={customerId} />
            <input type="hidden" name="isBlacklisted" value="true" />
            <div className="space-y-2">
              <Label htmlFor="reason">Alasan</Label>
              <textarea
                id="reason"
                name="reason"
                required
                minLength={3}
                className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="mis. Terlambat kembali 3 hari tanpa kabar"
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
              <Button type="submit" variant="destructive">
                Blacklist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <form action={setBlacklist} className="inline">
      <input type="hidden" name="id" value={customerId} />
      <input type="hidden" name="isBlacklisted" value="false" />
      <Button type="submit" variant="outline">
        Hilangkan Blacklist
      </Button>
    </form>
  );
}
