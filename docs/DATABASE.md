# MudahSewa — Database Schema (SQLite + Prisma)

**Lokasi DB:** `data/mudahsewa.db` (WAL mode) · **ORM:** Prisma 6 · **28 model**

## Diagram Relasi Inti

```
Category 1───* Product 1───* Unit
                 │            │
                 │            └──* UnitEvent
                 ├──* ProductImage
                 └──* LateFee (1:1)

Customer 1───* Order 1───* OrderItem *───1 Product
   │            │              └────? Unit (assigned saat aktif)
   │            ├──* Payment
   │            ├──* GopayPayment
   │            ├──* ReturnPhoto
   │            ├──* Document (jaminan per order)
   │            ├──* CodReminder (4 slot)
   │            ├──? Review (1:1)
   │            └──* MessageLog
   ├──* Document (profil)
   └──* Review

User (admin|mitra) ──* Order.handledBy
                   ──* AuditLog

GopaySession (singleton id=1)

StoreContent (singleton id=1) ── konfigurasi toko & metode bayar
HeroImage / Perk / Testimonial / VideoContent ── CMS storefront
PromoCode ──* Order
Session / Account / VerificationToken ── NextAuth
```

## Model Katalog & Inventori

### Category
| Field | Tipe | Keterangan |
|---|---|---|
| id | Int PK | autoincrement |
| name | String unique | nama kategori |
| description | String? | |

### Product
| Field | Tipe | Keterangan |
|---|---|---|
| id | Int PK | |
| sku | String unique | kode produk (mis. CAM-001) |
| categoryId | Int FK→Category | |
| name | String | nama produk |
| description | String? | |
| imagePath | String? | **DEPRECATED** — pakai ProductImage/Unit.photoPath |
| price6h / price12h / price24h / price48h | Float | harga tier per durasi (Rp) |
| stockThreshold | Int | min unit available agar tampil di katalog |
| active | Boolean | tayang/tidak |
| chargingRestHours | Int | buffer istirahat unit setelah selesai sewa (jam) |

### Unit (fisik)
| Field | Tipe | Keterangan |
|---|---|---|
| id | Int PK | |
| productId | Int FK→Product (cascade) | |
| serialNumber | String? unique | nomor seri fisik |
| photoPath | String? | `/uploads/units/...` |
| condition | String | `Bagus` \| `Cukup` \| `Rusak` |
| status | String | `available` \| `rented` \| `maintenance` \| `lost` |
| notes | String? | |

### ProductImage (galeri)
`productId FK`, `filePath`, `sortOrder` — max ~8 foto per produk.

### LateFee (denda per produk, 1:1)
`feePerDay` (Rp/hari), `graceHours` (tenggang), `active`.

## Model Pelanggan & Order

### Customer
| Field | Tipe | Keterangan |
|---|---|---|
| name / phone (unique) / email? / address? | | identitas |
| isBlacklisted + blacklistReason | | CRM blacklist |
| passwordHash | String? | login portal customer (HP + password) |

### Document (jaminan KTP/selfie)
`customerId FK`, `orderId? FK` (null = dokumen profil), `docType` (`ktp`|`selfie_ktp`|`kartu_pelajar`|`other`), `filePath`, `fileSize`, `fileHash unique` (anti duplikat).

### Order
Field utama:

| Grup | Field |
|---|---|
| Identitas | `id` (cuid), `orderNumber` unique, `customerId FK` |
| Jadwal | `startDate`, `endDate`, `rescheduledFrom?`, `returnedAt?` |
| Status | `status`: `booking`→`active`→`late`→`completed`/`cancelled` |
| Delivery | `courier?`, `courierFee`, `deliveryMode` (`pickup`\|`courier`), `deliveryAddress` |
| Jaminan | `guaranteeType`, `guaranteeNumber`, `depositAmount`, `depositStatus` |
| Pembayaran | `paymentMethod`, `paymentStatus` (`unpaid`\|`pending`\|`paid`\|`partial`\|`refunded`), `paymentRef`, `paymentCompleted`, `paymentCompleteAt` |
| Promo | `promoCodeId FK`, `promoDiscount` |
| Lain | `tipAmount`, `photoLink`, `handledBy` (legacy), `handledById FK→User`, `source` (`admin`\|`online`), `noteOrder` |

Indexes: `status`, `paymentCompleted`, `(startDate,endDate)`, `createdAt`, `handledById`.

### OrderItem
`orderId FK (cascade)`, `productId FK`, `unitId? FK` (assigned saat aktif), `quantity`, `durationHours`, `unitPrice` (**harga terkunci saat order**), `discountType`/`discountValue`, `subtotal`.

### Payment
`paymentType` (`dp`\|`pelunasan`\|`denda`), `method`, `status` (`pending`\|`confirmed`\|`failed`), `proofPath` (bukti upload), `gatewayRef`, `paidAt`.

### ReturnPhoto
Foto pengembalian per order: `filePath`, `fileSize`, `fileHash?`, `note`.

### Review
1:1 per order (`orderId unique`), `rating` 1-5, `text?`.

## Model Pembayaran GoPay

### GopaySession (singleton id=1)
`sessionJson` (token OAuth + deviceId — **sensitif**), `merchantId`, `merchantName`, `staticQris`, `phone`, `lastLoginAt`.

### GopayPayment
| Field | Keterangan |
|---|---|
| id | String PK (payment id dari PaymentService) |
| orderId | String? FK→Order (SetNull) — bisa null saat polling sebelum linked |
| baseAmount / uniqueOffset / uniqueAmount | **uniqueAmount unik per order aktif** → anti double-claim |
| status | `pending`\|`paid`\|`expired`\|`cancelled` |
| qrString | payload QRIS dinamis (jangan log!) |
| expiresAt / settledAt | |
| transactionJson | audit transaksi feed GoBiz |

## Model CMS Storefront

### StoreContent (singleton id=1)
- Identitas toko: `storeName`, `tagline`, `whatsapp`, `location`, `hours`
- Tampilan: `theme` (`y2k`\|`album`\|`mono`\|`coquette`), `heroVariant` (7 varian)
- Teks halaman: hero title/accent/subtitle, trust badges, judul section
- **Metode bayar**: `cashEnabled`, `qrisEnabled`, `transferEnabled`, `gopayEnabled` (Boolean)
- QRIS statis: `qrisImagePath`, `qrisMerchantName`
- Transfer: `transferBankName`, `transferAccountNumber`, `transferAccountHolder`

### HeroImage / Perk / Testimonial / VideoContent
Konten halaman depan: `sortOrder`, `active` untuk kontrol tayang.

## Model Auth & Pengguna

### User
`email unique`, `passwordHash`, `role` (`admin`\|`mitra`), `active`.

### Account / Session / VerificationToken
Tabel standar NextAuth (PrismaAdapter).

## Model Operasional

### UnitEvent (riwayat unit)
`unitId FK`, `orderId?`, `event` (`rented`\|`returned`\|`condition`\|`maintenance`\|`available`), `conditionBefore/After`, `note`.

### AuditLog
`entityType` (`order`\|`product`\|`customer`\|`unit`\|`payment`\|`user`\|`settings`), `entityId`, `action` (`create`\|`update`\|`delete`\|`status_change`), `summary`, `userId?`, `detail` (JSON).

### MessageLog (WhatsApp)
`sessionId`, `orderId?`, `chatId`, `type`, `body` (max 1000 char), `direction` (`sent`\|`received`), `status` (`pending`\|`delivered`\|`read`\|`failed`).

### CodReminder (reminder COD)
`orderId FK + slot` unique (`3h`\|`1h`\|`30m`\|`5m`), `sentAt?`, `status` (`pending`\|`sent`\|`skipped`), `error?`.

### PromoCode
`code unique`, `discountType` (`amount`\|`percent`), `discountValue`, `minOrderAmount?`, `maxDiscount?`, periode `startDate/endDate`, `usageLimit` (0=unlimited), `usedCount`.

## Aturan Bisnis di Level DB

1. **Order number**: format `MS-YYMMDD-NNN`, generated max-based per hari (commit c4acf73) — anti duplikat setelah delete.
2. **Ketersediaan**: overlap window `[startDate, endDate + chargingRestHours]` dicek di `src/lib/availability.ts` terhadap order `booking`/`active`/`late` produk yang sama.
3. **Harga terkunci**: `OrderItem.unitPrice` snapshot tier saat order dibuat — perubahan harga produk tidak mempengaruhi order lama.
4. **Anti double-claim GoPay**: `uniqueAmount` unik per transaksi aktif.
5. **Cascade deletes**: OrderItem/Payment/ReturnPhoto/Document(order)/CodReminder ikut terhapus bersama Order.
