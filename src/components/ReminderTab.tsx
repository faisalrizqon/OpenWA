"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings2, Save } from "lucide-react";
import type { ReminderSettings } from "@/lib/reminders/config";

interface ReminderTabProps {
  settings?: ReminderSettings;
}

export function ReminderTab({ settings }: ReminderTabProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialSettings: ReminderSettings = settings || {
    enabled: true,
    cod: { slots: { "3h": { enabled: true, minutesBefore: 180, label: "3 jam" }, "1h": { enabled: true, minutesBefore: 60, label: "1 jam" }, "30m": { enabled: true, minutesBefore: 30, label: "30 menit" }, "5m": { enabled: true, minutesBefore: 5, label: "5 menit" } }, graceMinutes: 10 },
    return: { slots: { "24h": { enabled: true, minutesBefore: 1440, label: "1 hari" }, "12h": { enabled: true, minutesBefore: 720, label: "12 jam" }, "1h": { enabled: false, minutesBefore: 60, label: "1 jam" } }, graceMinutes: 60 },
    late: { enabled: true, initialDelayHours: 2, repeatIntervalDays: 1 },
    scanIntervalSeconds: 60,
    notifyAdmin: false,
    adminPhone: null,
  };

  const [formData, setFormData] = useState<ReminderSettings>(initialSettings);

  const updateCodSlot = (key: string, field: "enabled" | "minutesBefore", value: boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      cod: { ...prev.cod, slots: { ...prev.cod.slots, [key]: { ...prev.cod.slots[key as keyof typeof prev.cod.slots], [field]: value } } },
    }));
  };

  const updateReturnSlot = (key: string, field: "enabled" | "minutesBefore", value: boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      return: { ...prev.return, slots: { ...prev.return.slots, [key]: { ...prev.return.slots[key as keyof typeof prev.return.slots], [field]: value } } },
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
      const response = await fetch("/api/cron/reminders", { method: "GET" });
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
      {saved && <p className="text-sm font-medium text-emerald-700">Pengaturan berhasil disimpan!</p>}
      {error && <Card className="border-red-200 bg-red-50"><CardContent className="pt-6"><p className="text-sm font-medium text-red-700">{error}</p></CardContent></Card>}

      {/* Global Controls */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-4" /> Pengaturan Global</CardTitle><CardDescription>Kontrol utama semua reminder</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label htmlFor="enabled" className="font-medium">Aktifkan Semua Reminder</Label><p className="text-xs text-muted-foreground">Nyalakan/matikan semua reminder sekaligus</p></div>
            <Switch id="enabled" checked={formData.enabled} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codGraceMinutes">Jendela Toleransi COD (menit)</Label>
              <Input id="codGraceMinutes" type="number" min="1" max="60" value={formData.cod.graceMinutes} onChange={(e) => setFormData((prev) => ({ ...prev, cod: { ...prev.cod, graceMinutes: Math.max(1, Number(e.target.value)) } }))} />
              <p className="text-xs text-muted-foreground">Slot lewat jendela ini di-skip untuk anti-spam</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnGraceMinutes">Jendela Toleransi Return (menit)</Label>
              <Input id="returnGraceMinutes" type="number" min="1" max="120" value={formData.return.graceMinutes} onChange={(e) => setFormData((prev) => ({ ...prev, return: { ...prev.return, graceMinutes: Math.max(1, Number(e.target.value)) } }))} />
              <p className="text-xs text-muted-foreground">Slot lewat jendela ini di-skip untuk anti-spam</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scanInterval">Interval Scan (detik)</Label>
              <Input id="scanInterval" type="number" min="15" step="15" value={formData.scanIntervalSeconds} onChange={(e) => setFormData((prev) => ({ ...prev, scanIntervalSeconds: Number(e.target.value) }))} />
              <p className="text-xs text-muted-foreground">Cek reminder setiap X detik</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="notifyAdmin" className="font-medium">Kirim Salinan ke Admin</Label>
            <div className="flex items-center gap-2">
              <Switch id="notifyAdmin" checked={formData.notifyAdmin} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, notifyAdmin: checked }))} />
              {formData.notifyAdmin && (
                <Input placeholder="08xxxxxxxxxx" className="w-48" value={formData.adminPhone ?? ""} onChange={(e) => setFormData((prev) => ({ ...prev, adminPhone: e.target.value }))} />
              )}
            </div>
            {!formData.notifyAdmin && <p className="text-xs text-muted-foreground">Nonaktifkan jika tidak ingin notifikasi ke admin</p>}
          </div>
        </CardContent>
      </Card>

      {/* COD Reminder Slots */}
      <Card>
        <CardHeader><CardTitle>Pengaturan Slot COD (Sebelum Pickup/Antar)</CardTitle><CardDescription>Jadwal reminder sebelum order diambil atau dikirimkan kurir</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(formData.cod.slots) as Array<[string, any]>).map(([key, slot]) => {
            const labels: Record<string, string> = { "3h": "3 Jam", "1h": "1 Jam", "30m": "30 Menit", "5m": "5 Menit" };
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Switch checked={slot.enabled} onCheckedChange={(checked) => updateCodSlot(key, "enabled", checked)} />
                  <div><Label className="font-medium">{labels[key]}</Label><p className="text-xs text-muted-foreground">{slot.minutesBefore} menit sebelum jadwal</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`minutes-${key}`} className="sr-only">Minutes for {key}</Label>
                  <Input id={`minutes-${key}`} type="number" min="1" max={key === "3h" ? 300 : key === "1h" ? 90 : key === "30m" ? 45 : 10} value={slot.minutesBefore} onChange={(e) => updateCodSlot(key, "minutesBefore", Math.max(1, Number(e.target.value)))} className="w-24" />
                  <span className="text-xs text-muted-foreground">menit</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* RETURN Reminder Slots */}
      <Card>
        <CardHeader><CardTitle>Pengaturan Slot RETURN (Sebelum Pengembalian)</CardTitle><CardDescription>Jadwal reminder sebelum jatuh tempo pengembalian</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(formData.return.slots) as Array<[string, any]>).map(([key, slot]) => {
            const labels: Record<string, string> = { "24h": "1 Hari", "12h": "12 Jam", "1h": "1 Jam" };
            return (
              <div key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Switch checked={slot.enabled} onCheckedChange={(checked) => updateReturnSlot(key, "enabled", checked)} />
                  <div><Label className="font-medium">{labels[key]}</Label><p className="text-xs text-muted-foreground">{slot.minutesBefore} menit sebelum jadwal</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`minutes-${key}`} className="sr-only">Minutes for {key}</Label>
                  <Input id={`minutes-${key}`} type="number" min="1" max={key === "24h" ? 1440 : key === "12h" ? 720 : 100} value={slot.minutesBefore} onChange={(e) => updateReturnSlot(key, "minutesBefore", Math.max(1, Number(e.target.value)))} className="w-24" />
                  <span className="text-xs text-muted-foreground">menit</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* LATE Reminder Settings */}
      <Card>
        <CardHeader><CardTitle>Peringatan Keterlambatan (LATE)</CardTitle><CardDescription>Pertama setelah order status berubah jadi 'Late', lalu update berkala</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label htmlFor="lateEnabled" className="font-medium">Aktifkan Peringatan Late</Label><p className="text-xs text-muted-foreground">Kirim warning saat order terlambat dikembalikan</p></div>
            <Switch id="lateEnabled" checked={formData.late.enabled} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, late: { ...prev.late, enabled: checked } }))} />
          </div>

          {formData.late.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="lateDelay">Delay Pertama Setelah Late (jam)</Label>
                <Input id="lateDelay" type="number" min="1" value={formData.late.initialDelayHours} onChange={(e) => setFormData((prev) => ({ ...prev, late: { ...prev.late, initialDelayHours: Math.max(1, Number(e.target.value)) } }))} />
                <p className="text-xs text-muted-foreground">Reminder pertama dikirim {formData.late.initialDelayHours} jam setelah order status berubah jadi 'Late'</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateRepeat">Update Berkala Setiap X Hari</Label>
                <Input id="lateRepeat" type="number" min="1" max="30" value={formData.late.repeatIntervalDays} onChange={(e) => setFormData((prev) => ({ ...prev, late: { ...prev.late, repeatIntervalDays: Math.max(1, Math.min(30, Number(e.target.value))) } }))} />
                <p className="text-xs text-muted-foreground">Reminder akan di-update setiap {formData.late.repeatIntervalDays} hari selama order belum kembali</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSubmit} disabled={loading} className="gap-2"><Save className="size-4" /> Simpan Pengaturan</Button>
        <Button onClick={handleTestScan} variant="outline" disabled={loading} className="gap-2">Run Test Scan</Button>
      </div>
    </div>
  );
}
