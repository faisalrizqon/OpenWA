/**
 * Komponen ReminderTab untuk pengaturan reminder COD advance.
 * 
 * Menampilkan dan mengatur:
 * - Toggle enable/disable reminder secara global
 * - Toggle + menit per slot (3h/1h/30m/5m)
 * - Jendela toleransi (grace minutes)
 * - Interval scan scheduler
 * - Notifikasi ke admin
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Save, Settings2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReminderSettings } from "@/lib/reminders/config";

interface ReminderTabProps {
  settings?: ReminderSettings;
}

export function ReminderTab({ settings }: ReminderTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialSettings: ReminderSettings = settings || {
    enabled: true,
    slots: {
      "3h": { enabled: true, minutes: 180 },
      "1h": { enabled: true, minutes: 60 },
      "30m": { enabled: true, minutes: 30 },
      "5m": { enabled: true, minutes: 5 },
    },
    graceMinutes: 10,
    scanIntervalSeconds: 60,
    notifyAdmin: false,
    adminPhone: null,
  };

  const [formData, setFormData] = useState<ReminderSettings>(initialSettings);

  const updateSlot = (key: "3h" | "1h" | "30m" | "5m", field: "enabled" | "minutes", value: boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      slots: {
        ...prev.slots,
        [key]: { ...prev.slots[key], [field]: value },
      },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch("/api/reminders/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Gagal menyimpan pengaturan");

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleTestScan = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reminders/scan", {
        method: "GET",
      });

      if (!response.ok) throw new Error("Gagal menjalankan scan");

      const result = await response.json();
      alert(`Scan completed:\n- Scanned: ${result.scanned}\n- Sent: ${result.sent}\n- Skipped: ${result.skipped}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal run scan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Status */}
      {saved && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <AlertCircle className="size-4 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">Pengaturan berhasil disimpan!</p>
        </div>
      )}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-4" />
            Pengaturan Global
          </CardTitle>
          <CardDescription>Kontrol utama reminder COD otomatis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="font-medium">Aktifkan Reminder</Label>
              <p className="text-xs text-muted-foreground">Nyalakan/matikan semua reminder sekaligus</p>
            </div>
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="graceMinutes">Jendela Toleransi (menit)</Label>
              <Input
                id="graceMinutes"
                type="number"
                min="1"
                value={formData.graceMinutes}
                onChange={(e) => setFormData((prev) => ({ ...prev, graceMinutes: Math.max(1, Number(e.target.value)) }))}
              />
              <p className="text-xs text-muted-foreground">
                Slot lewat jendela ini di-skip untuk anti-spam
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scanInterval">Interval Scan (detik)</Label>
              <Input
                id="scanInterval"
                type="number"
                min="15"
                step="15"
                value={formData.scanIntervalSeconds}
                onChange={(e) => setFormData((prev) => ({ ...prev, scanIntervalSeconds: Number(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">Cek reminder setiap X detik</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan Slot Reminder</CardTitle>
          <CardDescription>Waktu sebelum pickup/antar untuk mengirim reminder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(formData.slots) as Array<[keyof typeof formData.slots, typeof formData.slots["3h"]]>).map(
            ([key, slot]) => {
              const labels = { "3h": "3 Jam", "1h": "1 Jam", "30m": "30 Menit", "5m": "5 Menit" } as const;
              return (
                <div key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={slot.enabled}
                      onCheckedChange={(checked) => updateSlot(key, "enabled", checked)}
                    />
                    <div>
                      <Label className="font-medium">{labels[key]}</Label>
                      <p className="text-xs text-muted-foreground">
                        {slot.minutes} menit sebelum jadwal
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`minutes-${key}`} className="sr-only">
                      Minutes for {key}
                    </Label>
                    <Input
                      id={`minutes-${key}`}
                      type="number"
                      min="1"
                      max={key === "3h" ? 300 : key === "1h" ? 90 : key === "30m" ? 45 : 10}
                      value={slot.minutes}
                      onChange={(e) => updateSlot(key, "minutes", Math.max(1, Number(e.target.value)))}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">menit</span>
                  </div>
                </div>
              );
            }
          )}
        </CardContent>
      </Card>

      {/* Admin Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Notifikasi ke Admin</CardTitle>
          <CardDescription>Siap dapat salinan reminder yang terkirim?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifyAdmin" className="font-medium">Kirim ke Admin</Label>
              <p className="text-xs text-muted-foreground">Salinan WA dikirim ke nomor admin setelah reminder terkirim</p>
            </div>
            <Switch
              id="notifyAdmin"
              checked={formData.notifyAdmin}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, notifyAdmin: checked }))}
            />
          </div>

          {formData.notifyAdmin && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="adminPhone">Nomor WA Admin</Label>
              <Input
                id="adminPhone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={formData.adminPhone ?? ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, adminPhone: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Format: 08xx (tanpa kode negara)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="gap-2"
        >
          <Save className="size-4" />
          Simpan Pengaturan
        </Button>
        <Button
          onClick={handleTestScan}
          variant="outline"
          disabled={loading}
          className="gap-2"
        >
          Run Test Scan
        </Button>
      </div>
    </div>
  );
}
