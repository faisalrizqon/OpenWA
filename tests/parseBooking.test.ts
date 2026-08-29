import { describe, it, expect } from "vitest";
import { parseBookingMessage, matchProduct } from "@/lib/parseBooking";

const PESAN_ASLI = `Hai kak!! 🌻🫰🏻

Harap mengisi format dibawah ya untuk booking digicam!

Nama Penyewa : maya okta
Jenis Kamera   : canon ps a4000
Durasi (berapa hari) : 6jam
Jaminan (KTP/SIM) :ktp
Lokasi COD : 
Tanggal Booking/Sewa : 23 agustus 2026,minggu

Sewa akan dikonfirmasi setelah melakukan pembayaran DP 50%

DP Rek Jago 105170269327 
A.N M Faisal Rizqon 

Tidak bisa refund apabila cancel booking tetapi bisa ubah tanggal pada H-2

Apabila ada pertanyaan, bisa langsung sampaikan ke mimin, Terima kasih 💖`;

const PRODUCTS = [
  { id: 1, name: "Kodak Pixpro FZ55", sku: "CAM-001" },
  { id: 2, name: "Canon Ixus", sku: "CAM-002" },
  { id: 3, name: "Sony Cybershot DSC W810", sku: "CAM-003" },
  { id: 4, name: "Canon PowerShot A4000 IS", sku: "CAM-004" },
];

describe("parseBookingMessage", () => {
  it("parse pesan asli lengkap", () => {
    const r = parseBookingMessage(PESAN_ASLI);
    expect(r.nama).toBe("maya okta");
    expect(r.kamera).toBe("canon ps a4000");
    expect(r.durasiJam).toBe(6);
    expect(r.jaminan).toBe("ktp");
    expect(r.lokasiCod).toBeUndefined(); // kosong
    expect(r.tanggal).toEqual(new Date(2026, 7, 23)); // 23 agustus 2026
  });

  it("durasi dalam hari dikonversi ke jam", () => {
    const r = parseBookingMessage("Durasi (berapa hari) : 2 hari");
    expect(r.durasiJam).toBe(48);
  });

  it("durasi tanpa satuan dianggap jam", () => {
    const r = parseBookingMessage("Durasi : 24");
    expect(r.durasiJam).toBe(24);
  });

  it("jaminan sim", () => {
    const r = parseBookingMessage("Jaminan (KTP/SIM) : SIM");
    expect(r.jaminan).toBe("sim");
  });

  it("tanggal tanpa tahun pakai tahun berjalan", () => {
    const r = parseBookingMessage("Tanggal Booking/Sewa : 5 januari, senin");
    expect(r.tanggal?.getFullYear()).toBe(new Date().getFullYear());
    expect(r.tanggal?.getMonth()).toBe(0);
    expect(r.tanggal?.getDate()).toBe(5);
  });

  it("lokasi COD terisi", () => {
    const r = parseBookingMessage("Lokasi COD : Weleri");
    expect(r.lokasiCod).toBe("Weleri");
  });

  it("teks tak berformat menghasilkan objek kosong", () => {
    const r = parseBookingMessage("halo kak mau tanya harga");
    expect(r.nama).toBeUndefined();
    expect(r.kamera).toBeUndefined();
    expect(r.tanggal).toBeUndefined();
  });
});

describe("matchProduct", () => {
  it("canon ps a4000 → Canon PowerShot A4000 IS", () => {
    expect(matchProduct("canon ps a4000", PRODUCTS)).toBe(4);
  });

  it("kodak fz55 → Kodak Pixpro FZ55", () => {
    expect(matchProduct("kodak fz55", PRODUCTS)).toBe(1);
  });

  it("canon ixus 185 → Canon Ixus", () => {
    expect(matchProduct("canon ixus 185", PRODUCTS)).toBe(2);
  });

  it("sony w810 → Sony Cybershot DSC W810", () => {
    expect(matchProduct("sony w810", PRODUCTS)).toBe(3);
  });

  it("nama persis", () => {
    expect(matchProduct("Kodak Pixpro FZ55", PRODUCTS)).toBe(1);
  });

  it("tidak cocok → undefined", () => {
    expect(matchProduct("gopro hero", PRODUCTS)).toBeUndefined();
  });
});
