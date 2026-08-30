"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings2, Save, Users, User, Plus, Trash2, MessageCircle, Bell, CalendarClock, AlertTriangle } from "lucide-react";
import type { ReminderSettings } from "@/lib/reminders/config";

interface ReminderTabProps {
  settings?: ReminderSettings;
}

const DEFAULT_SLOTS = {
  "3h": { enabled: true, minutesBefore: 180, label: "3 jam" },
  "1h": { enabled: true, minutesBefore: 60, label: "1 jam" },
  "30m": { enabled: true, minutesBefore: 30, label: "30 menit" },
  "5m": { enabled: true, minutesBefore: 5, label: "5 menit" },
};
const RETURN_SLOTS = {
  "24h": { enabled: true, minutesBefore: 1440, label: "1 hari" },
  "12h": { enabled: true, minutesBefore: 720, label: "12 jam" },
  "1h": { enabled: false, minutesBefore: 60, label: "1 jam" },
};

function parsePhones(raw: string | null): string[] {
  if (!raw) return [];
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string" && x.trim() !== "");
    } catch {
      return [];
    }
    return [];
  }
  return t ? [t] : [];
}

export function ReminderTab({ settings }: ReminderTabProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialSettings: ReminderSettings = settings || {
    enabled: true,
    cod: { slots: DEFAULT_SLOTS, graceMinutes: 10 },
    return: { slots: RETURN_SLOTS, graceMinutes: 60 },
    late: { enabled: true, initialDelayHours: 2, repeatIntervalDays: 1 },
    scanIntervalSeconds: 60,
    sendToCustomer: false,
    sendToAdmin: true,
    adminPhones: null,
    notifyAdmin: false,
    adminPhone: null,
  };

  const [formData, setFormData] = useState<ReminderSettings>(initialSettings);
  const [adminPhoneList, setAdminPhoneList] = useState<string[]>(parsePhones(initialSettings.adminPhones));

  // Khusus test kirim — daftar nomor yang DIINPUT manual (bukan dari DB atau form utama).
  const [testPhones, setTestPhones] = useState<string[]>([]);

  const updateCodSlot = (key: keyof typeof formData.cod.slots, field: "enabled" | "minutesBefore", value: boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      cod: { ...prev.cod, slots: { ...prev.cod.slots, [key]: { ...prev.cod.slots[key], [field]: value } } },
    }));
  };

  const updateReturnSlot = (key: keyof typeof formData.return.slots, field: "enabled" | "minutesBefore", value: boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      return: { ...prev.return, slots: { ...prev.return.slots, [key]: { ...prev.return.slots[key], [field]: value } } },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const payload: ReminderSettings = {
        ...formData,
        adminPhones: adminPhoneList.length > 0 ? JSON.stringify(adminPhoneList) : null,
      };
      const response = await fetch("/api/reminders/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      const response = await fetch("/api/reminders/scan");
      if (!response.ok) throw new Error("Gagal menjalankan scan");
      const result = await response.json();
      alert(`Scan selesai:\n- Dipindai: ${result.scanned}\n- Terkirim: ${result.sent}\n- Dilewati: ${result.skipped}\n- Gagal: ${result.failed}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menjalankan scan");
    } finally {
      setLoading(false);
    }
  };

  const handleTestSend = async (type: "cod" | "return" | "late") => {
    setLoading(true);
    setError(null);
    setSaved(false);
    if (testPhones.length === 0) {
      setError("Masukkan minimal satu nomor WA tujuan sebelum test kirim.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/reminders/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, phones: testPhones }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal kirim pesan test");
      const targetLines = (result.sentTo ?? [])
        .map((s: { phone: string; ok: boolean }) => `- ${s.phone}: ${s.ok ? "✅ terkirim" : "❌ gagal"}`)
        .join("\n");
      alert(`Test kirim ${type.toUpperCase()}:\n\n${result.message}\n\nDetail target:\n${targetLines}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat test kirim");
    } finally {
      setLoading(false);
    }
  };

  const labels = { "3h": "3 Jam", "1h": "1 Jam", "30m": "30 Menit", "5m": "5 Menit" } as const;
  const returnLabels = { "24h": "1 Hari", "12h": "12 Jam", "1h": "1 Jam" } as const;

  return (
    <div className="space-y-6">
      {saved && <p className="text-sm font-medium text-emerald-700">✓ Pengaturan berhasil disimpan!</p>}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6"><p className="text-sm font-medium text-red-700">{error}</p></CardContent>
        </Card>
      )}

      {/* Global Controls */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="size-4" /> Pengaturan Global</CardTitle><CardDescription>Kontrol utama semua reminder</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label htmlFor="enabled" className="font-medium">Aktifkan Semua Reminder</Label><p className="text-xs text-muted-foreground">Nyalakan/matikan semua reminder sekaligus</p></div>
            <Switch id="enabled" checked={formData.enabled} onCheckedChange={(c) => setFormData((p) => ({ ...p, enabled: c }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codGrace">Jendela Toleransi COD (menit)</Label>
              <Input id="codGrace" type="number" min="1" max="60" value={formData.cod.graceMinutes} onChange={(e) => setFormData((p) => ({ ...p, cod: { ...p.cod, graceMinutes: Math.max(1, Number(e.target.value)) } }))} />
              <p className="text-xs text-muted-foreground">Slot lewat jendela ini di-skip untuk anti-spam</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnGrace">Jendela Toleransi Return (menit)</Label>
              <Input id="returnGrace" type="number" min="1" max="120" value={formData.return.graceMinutes} onChange={(e) => setFormData((p) => ({ ...p, return: { ...p.return, graceMinutes: Math.max(1, Number(e.target.value)) } }))} />
              <p className="text-xs text-muted-foreground">Slot lewat jendela ini di-skip untuk anti-spam</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scanInterval">Interval Scan (detik)</Label>
              <Input id="scanInterval" type="number" min="15" step="15" value={formData.scanIntervalSeconds} onChange={(e) => setFormData((p) => ({ ...p, scanIntervalSeconds: Math.max(15, Number(e.target.value)) }))} />
              <p className="text-xs text-muted-foreground">Cek reminder setiap X detik</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Selection */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-4" /> Target Penerima Reminder</CardTitle><CardDescription>Pilih siapa yang menerima notifikasi WA</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="font-medium">Kirim ke Customer</Label><p className="text-xs text-muted-foreground">Notifikasi langsung ke nomor WA pelanggan</p></div>
            <Switch checked={formData.sendToCustomer} onCheckedChange={(c) => setFormData((p) => ({ ...p, sendToCustomer: c }))} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label className="font-medium">Kirim ke Admin</Label><p className="text-xs text-muted-foreground">Notifikasi ke nomor WA admin (untuk monitoring internal)</p></div>
            <Switch checked={formData.sendToAdmin} onCheckedChange={(c) => setFormData((p) => ({ ...p, sendToAdmin: c }))} />
          </div>

          {formData.sendToAdmin && (
            <div className="space-y-2 rounded-lg border p-4">
              <Label className="font-medium">Nomor WA Admin</Label>
              <p className="text-xs text-muted-foreground">Format: 08xxxxxxxxxx. Bisa menambahkan lebih dari satu nomor.</p>
              <div className="space-y-2">
                {adminPhoneList.map((phone, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      value={phone}
                      onChange={(e) => setAdminPhoneList((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setAdminPhoneList((prev) => prev.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setAdminPhoneList((prev) => [...prev, ""])} className="gap-1.5">
                <Plus className="size-4" /> Tambah Nomor
              </Button>
            </div>
          )}

          {!formData.sendToCustomer && !formData.sendToAdmin && (
            <p className="text-sm font-medium text-amber-700">⚠️ Tidak ada target penerima — reminder tidak akan terkirim.</p>
          )}
        </CardContent>
      </Card>

      {/* COD Reminder Slots */}
      <Card>
        <CardHeader><CardTitle>Pengaturan Slot COD (Sebelum Pickup/Antar)</CardTitle><CardDescription>Jadwal reminder sebelum order diambil atau dikirimkan kurir</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(formData.cod.slots) as Array<[keyof typeof formData.cod.slots, any]>).map(([key, slot]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Switch checked={slot.enabled} onCheckedChange={(c) => updateCodSlot(key, "enabled", c)} />
                <div><Label className="font-medium">{labels[key]}</Label><p className="text-xs text-muted-foreground">{slot.minutesBefore} menit sebelum jadwal</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="1" max={key === "3h" ? 300 : key === "1h" ? 90 : key === "30m" ? 45 : 10}
                  value={slot.minutesBefore}
                  onChange={(e) => updateCodSlot(key, "minutesBefore", Math.max(1, Number(e.target.value)))}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">menit</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* RETURN Reminder Slots */}
      <Card>
        <CardHeader><CardTitle>Pengaturan Slot RETURN (Sebelum Pengembalian)</CardTitle><CardDescription>Jadwal reminder sebelum jatuh tempo pengembalian</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {(Object.entries(formData.return.slots) as Array<[keyof typeof formData.return.slots, any]>).map(([key, slot]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Switch checked={slot.enabled} onCheckedChange={(c) => updateReturnSlot(key, "enabled", c)} />
                <div><Label className="font-medium">{returnLabels[key]}</Label><p className="text-xs text-muted-foreground">{slot.minutesBefore} menit sebelum jadwal</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="1" max={key === "24h" ? 1440 : key === "12h" ? 720 : 100}
                  value={slot.minutesBefore}
                  onChange={(e) => updateReturnSlot(key, "minutesBefore", Math.max(1, Number(e.target.value)))}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">menit</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* LATE Reminder Settings */}
      <Card>
        <CardHeader><CardTitle>Peringatan Keterlambatan (LATE)</CardTitle><CardDescription>Pertama setelah order status berubah jadi 'Late', lalu update berkala</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label htmlFor="lateEnabled" className="font-medium">Aktifkan Peringatan Late</Label><p className="text-xs text-muted-foreground">Kirim warning saat order terlambat dikembalikan</p></div>
            <Switch id="lateEnabled" checked={formData.late.enabled} onCheckedChange={(c) => setFormData((p) => ({ ...p, late: { ...p.late, enabled: c } }))} />
          </div>
          {formData.late.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lateDelay">Delay Pertama Setelah Late (jam)</Label>
                <Input id="lateDelay" type="number" min="1" value={formData.late.initialDelayHours} onChange={(e) => setFormData((p) => ({ ...p, late: { ...p.late, initialDelayHours: Math.max(1, Number(e.target.value)) } }))} />
                <p className="text-xs text-muted-foreground">Reminder pertama dikirim {formData.late.initialDelayHours} jam setelah status jadi 'Late'</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateRepeat">Update Berkala Setiap X Hari</Label>
                <Input id="lateRepeat" type="number" min="1" max="30" value={formData.late.repeatIntervalDays} onChange={(e) => setFormData((p) => ({ ...p, late: { ...p.late, repeatIntervalDays: Math.max(1, Math.min(30, Number(e.target.value))) } }))} />
                <p className="text-xs text-muted-foreground">Reminder di-update setiap {formData.late.repeatIntervalDays} hari selama order belum kembali</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSubmit} disabled={loading} className="gap-2"><Save className="size-4" /> Simpan Pengaturan</Button>
        <Button onClick={handleTestScan} variant="outline" disabled={loading}>Run Test Scan</Button>
      </div>

      {/* Test Send Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-4" /> Test Kirim Langsung
          </CardTitle>
          <CardDescription>
            Kirim pesan test HANYA ke nomor yang kamu ketik di bawah — tidak pernah mengambil
            nomor customer/database secara otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-lg border p-4">
            <Label className="font-medium">Nomor WA Tujuan Test</Label>
            <p className="text-xs text-muted-foreground">Format: 08xxxxxxxxxx. Wajib diisi sebelum test — tanpa nomor, tidak ada pesan yang dikirim.</p>
            <div className="space-y-2">
              {testPhones.map((phone, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={phone}
                    onChange={(e) => setTestPhones((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setTestPhones((prev) => prev.filter((_, i) => i !== idx))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setTestPhones((prev) => [...prev, ""])} className="gap-1.5">
              <Plus className="size-4" /> Tambah Nomor
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleTestSend("cod")} variant="outline" disabled={loading || testPhones.length === 0} className="gap-2">
              <Bell className="size-4" /> Test COD
            </Button>
            <Button onClick={() => handleTestSend("return")} variant="outline" disabled={loading || testPhones.length === 0} className="gap-2">
              <CalendarClock className="size-4" /> Test Return
            </Button>
            <Button onClick={() => handleTestSend("late")} variant="outline" disabled={loading || testPhones.length === 0} className="gap-2">
              <AlertTriangle className="size-4" /> Test Late
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Pesan test dikirim langsung ke nomor yang kamu ketik di atas. Gunakan ini untuk verifikasi pengaturan sebelum production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
