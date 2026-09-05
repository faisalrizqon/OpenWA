"use client";

import * as React from "react";

/**
 * Draft perubahan halaman detail order.
 *
 * Setiap edit di card TIDAK langsung ditulis ke database. Perubahan ditampung di
 * state client sebagai draft, dan baru dieksekusi sekali saat tombol "Simpan" di
 * paling bawah ditekan. Bila user menekan "Batal" atau meninggalkan halaman tanpa
 * menyimpan, draft dibuang dan database tetap seperti semula.
 */

export interface OrderDraftDetails {
  guaranteeType?: string | null;
  guaranteeNumber?: string | null;
  deliveryMode?: string | null;
  deliveryAddress?: string | null;
  noteOrder?: string | null;
  photoLink?: string | null;
}

/** Ongkos antar & tip untuk ongkir/tip form. */
export interface OrderDraftFees {
  courierFee?: number;
  tipAmount?: number;
}

/** Rentang sewa baru (reschedule) dalam format lokal `YYYY-MM-DDTHH:mm`. */
export interface OrderDraftReschedule {
  startDate: string;
  endDate: string;
}

/** Item baru yang mau ditambah. */
export interface OrderDraftItemAdd {
  productId: number;
  quantity: number;
  durationHours: number;
}

/** Edit qty/durasi item existing. */
export interface OrderDraftItemUpdate {
  itemId: number;
  quantity: number;
  durationHours: number;
}

/** Harga satuan per item (item prices update). */
export interface OrderDraftItemPrice {
  itemId: number;
  unitPrice: number;
}

/** Pembayaran baru yang mau ditambah. */
export interface OrderDraftPaymentAdd {
  amount: number;
  paymentType: string;
  method?: string;
  note?: string;
  /** File bukti — tidak bisa di-JSON, dikirim terpisah via FormData. */
  proof?: File | null;
}

/** Edit pembayaran existing (amount/type/method/note). */
export interface OrderDraftPaymentEdit {
  paymentId: number;
  amount: number;
  paymentType?: string;
  method?: string;
  note?: string;
  proof?: File | null;
}

/** Dokument jaminan yang mau dihapus. */
export interface OrderDraftGuaranteeDelete {
  documentId: number;
}

/** Kondisi unit saat return. */
export interface OrderDraftReturnCondition {
  unitId: number;
  condition: string;
}

export interface OrderDraftState {
  /** null = card data pelanggan belum disentuh. */
  details: OrderDraftDetails | null;
  /** null = fees belum disentuh. */
  fees: OrderDraftFees | null;
  /** null/status "" = status tidak diubah. */
  status: string | null;
  /** null = tanggal tidak diubah. */
  reschedule: OrderDraftReschedule | null;

  itemsToAdd: OrderDraftItemAdd[];
  itemsToUpdate: OrderDraftItemUpdate[];
  itemPricesToEdit: OrderDraftItemPrice[];
  itemsToDelete: number[];

  paymentsToAdd: OrderDraftPaymentAdd[];
  paymentsToEdit: OrderDraftPaymentEdit[];
  paymentsToDelete: number[];

  guaranteeDocsToDelete: number[];
  guaranteeDocType: string | null;
  guaranteeFile: File | null;
  guaranteeSelfie: File | null;

  returnComplete: boolean;
  returnConditions: OrderDraftReturnCondition[];
  returnNotes: string;
  returnPhotos: File[];
  returnPhotosToDelete: number[];
}

const EMPTY_DRAFT: OrderDraftState = {
  details: null,
  fees: null,
  status: null,
  reschedule: null,

  itemsToAdd: [],
  itemsToUpdate: [],
  itemPricesToEdit: [],
  itemsToDelete: [],

  paymentsToAdd: [],
  paymentsToEdit: [],
  paymentsToDelete: [],

  guaranteeDocsToDelete: [],
  guaranteeDocType: null,
  guaranteeFile: null,
  guaranteeSelfie: null,

  returnComplete: false,
  returnConditions: [],
  returnNotes: "",
  returnPhotos: [],
  returnPhotosToDelete: [],
};

interface OrderDraftValue extends OrderDraftState {
  /** True bila ada minimal satu perubahan yang belum disimpan. */
  dirty: boolean;
  /** Daftar ringkas perubahan tertunda, untuk ditampilkan ke user. */
  pendingLabels: string[];
  setDetails: (patch: Partial<OrderDraftDetails>) => void;
  setFees: (patch: Partial<OrderDraftFees>) => void;
  setStatus: (status: string | null) => void;
  setReschedule: (value: OrderDraftReschedule | null) => void;
  addItem: (item: OrderDraftItemAdd) => void;
  updateItem: (item: OrderDraftItemUpdate) => void;
  deleteItem: (itemId: number) => void;
  addItemPrice: (price: OrderDraftItemPrice) => void;
  /** Hapus pembayaran draft pada indeks tertentu (array = urutan tambah). */
  removePendingPayment: (index: number) => void;
  addPayment: (payment: OrderDraftPaymentAdd) => void;
  editPayment: (payment: OrderDraftPaymentEdit) => void;
  deletePayment: (paymentId: number) => void;
  setGuarantee: (value: { docType: string; file: File | null; selfie: File | null }) => void;
  deleteGuaranteeDoc: (documentId: number) => void;
  setReturn: (value: {
    complete: boolean;
    conditions: OrderDraftReturnCondition[];
    notes: string;
    photos: File[];
  }) => void;
  deleteReturnPhoto: (photoId: number) => void;
  /** Buang semua perubahan tertunda. */
  reset: () => void;
  /** Susun FormData untuk batchCommitAllChanges. */
  buildFormData: (orderId: string) => FormData;
}

const OrderDraftContext = React.createContext<OrderDraftValue | null>(null);

/** Buang key bernilai undefined agar "key ada" benar-benar berarti "diubah". */
function pruneUndefined<T extends object>(value: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) {
      (out as Record<string, unknown>)[key] = val;
    }
  }
  return out;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export function OrderDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = React.useState<OrderDraftState>(EMPTY_DRAFT);

  const value = React.useMemo<OrderDraftValue>(() => {
    const pendingLabels: string[] = [];
    if (draft.details && Object.keys(draft.details).length > 0) pendingLabels.push("Data pelanggan");
    if (draft.fees && Object.keys(draft.fees).length > 0) pendingLabels.push("Ongkir/Tip");
    if (draft.reschedule) pendingLabels.push("Tanggal sewa");
    if (draft.status) pendingLabels.push(`Status → ${STATUS_LABELS[draft.status] ?? draft.status}`);
    if (draft.itemsToAdd.length > 0) pendingLabels.push(`${draft.itemsToAdd.length} item baru`);
    if (draft.itemsToUpdate.length > 0 || draft.itemPricesToEdit.length > 0) pendingLabels.push("Ubah qty/harga item");
    if (draft.itemsToDelete.length > 0) pendingLabels.push(`${draft.itemsToDelete.length} hapus item`);
    if (draft.paymentsToAdd.length > 0) pendingLabels.push(`${draft.paymentsToAdd.length} pembayaran baru`);
    if (draft.paymentsToEdit.length > 0 || draft.paymentsToDelete.length > 0) pendingLabels.push("Edit pembayaran");
    if (draft.guaranteeDocsToDelete.length > 0 || draft.guaranteeFile || draft.guaranteeSelfie) {
      pendingLabels.push("Dokumen jaminan");
    }
    if (draft.returnConditions.length > 0 || draft.returnPhotos.length > 0) pendingLabels.push("Return kondisi/foto");
    if (draft.returnComplete) pendingLabels.push("Selesaikan return");

    const prunedDetails = draft.details ? pruneUndefined(draft.details) : undefined;
    const prunedFees = draft.fees ? pruneUndefined(draft.fees) : undefined;

    return {
      ...draft,
      dirty: pendingLabels.length > 0,
      pendingLabels,

      setDetails: (patch) =>
        setDraft((prev) => ({
          ...prev,
          details: { ...prev.details, ...pruneUndefined(patch) },
        })),

      setFees: (patch) =>
        setDraft((prev) => ({
          ...prev,
          fees: { ...prev.fees, ...pruneUndefined(patch) },
        })),

      setStatus: (status) => setDraft((prev) => ({ ...prev, status })),

      setReschedule: (reschedule) => setDraft((prev) => ({ ...prev, reschedule })),

      addItem: (item) =>
        setDraft((prev) => ({ ...prev, itemsToAdd: [...prev.itemsToAdd, item] })),

      updateItem: (item) =>
        setDraft((prev) => ({
          ...prev,
          // Satu entri per item: perubahan terakhir menang.
          itemsToUpdate: [...prev.itemsToUpdate.filter((u) => u.itemId !== item.itemId), item],
        })),

      deleteItem: (itemId) =>
        setDraft((prev) => ({
          ...prev,
          itemsToDelete: [...prev.itemsToDelete, itemId],
          itemsToUpdate: prev.itemsToUpdate.filter((i) => i.itemId !== itemId),
        })),

      addItemPrice: (price) =>
        setDraft((prev) => ({
          ...prev,
          itemPricesToEdit: [...prev.itemPricesToEdit.filter((p) => p.itemId !== price.itemId), price],
        })),

      addPayment: (payment) =>
        setDraft((prev) => ({ ...prev, paymentsToAdd: [...prev.paymentsToAdd, payment] })),

      editPayment: (payment) =>
        setDraft((prev) => ({
          ...prev,
          paymentsToEdit: [...prev.paymentsToEdit.filter((p) => p.paymentId !== payment.paymentId), payment],
        })),
      removePendingPayment: (index) =>
        setDraft((prev) => ({ ...prev, paymentsToAdd: prev.paymentsToAdd.filter((_, i) => i !== index) })),

      deletePayment: (paymentId) =>
        setDraft((prev) => ({
          ...prev,
          paymentsToDelete: [...prev.paymentsToDelete, paymentId],
          paymentsToEdit: prev.paymentsToEdit.filter((p) => p.paymentId !== paymentId),
        })),

      setGuarantee: ({ docType, file, selfie }: { docType: string; file: File | null; selfie: File | null }) =>
        setDraft((prev) => ({
          ...prev,
          guaranteeDocType: docType,
          guaranteeFile: file,
          guaranteeSelfie: selfie,
        })),

      deleteGuaranteeDoc: (documentId) =>
        setDraft((prev) => ({
          ...prev,
          guaranteeDocsToDelete: [...prev.guaranteeDocsToDelete, documentId],
        })),

      setReturn: ({ complete, conditions, notes, photos }) =>
        setDraft((prev) => ({
          ...prev,
          returnComplete: complete,
          returnConditions: conditions,
          returnNotes: notes,
          returnPhotos: photos,
        })),

      deleteReturnPhoto: (photoId) =>
        setDraft((prev) => ({
          ...prev,
          returnPhotosToDelete: [...prev.returnPhotosToDelete, photoId],
        })),

      reset: () => setDraft(EMPTY_DRAFT),

      buildFormData: (orderId) => {
        const fd = new FormData();
        fd.set("orderId", orderId);

        if (draft.status) fd.set("status", draft.status);
        if (draft.reschedule) {
          fd.set("rescheduleStart", draft.reschedule.startDate);
          fd.set("rescheduleEnd", draft.reschedule.endDate);
        }
        if (draft.details) {
          fd.set("orderDetails", JSON.stringify(prunedDetails));
        }
        if (draft.fees) {
          fd.set("orderFees", JSON.stringify(prunedFees));
        }

        if (draft.itemsToAdd.length > 0) fd.set("itemsToAdd", JSON.stringify(draft.itemsToAdd));
        if (draft.itemsToUpdate.length > 0) fd.set("itemsToUpdate", JSON.stringify(draft.itemsToUpdate));
        if (draft.itemsToDelete.length > 0) fd.set("itemsToDelete", JSON.stringify(draft.itemsToDelete));
        if (draft.itemPricesToEdit.length > 0) fd.set("itemPrices", JSON.stringify(draft.itemPricesToEdit));

        if (draft.paymentsToAdd.length > 0) {
          const payload = draft.paymentsToAdd.map((p) => ({
            amount: p.amount,
            paymentType: p.paymentType,
            method: p.method ?? "",
            note: p.note ?? "",
          }));
          fd.set("paymentsToAdd", JSON.stringify(payload));

          const slots: number[] = [];
          draft.paymentsToAdd.forEach((p, i) => {
            if (p.proof && p.proof.size > 0) {
              slots.push(i);
              fd.append("paymentProofs", p.proof);
            }
          });
          if (slots.length > 0) fd.set("paymentProofSlots", JSON.stringify(slots));
        }

        if (draft.paymentsToEdit.length > 0) {
          fd.set(
            "paymentsToEdit",
            JSON.stringify(
              draft.paymentsToEdit.map((p) => ({
                paymentId: p.paymentId,
                amount: p.amount,
                paymentType: p.paymentType ?? "",
                method: p.method ?? "",
                note: p.note ?? "",
              }))
            )
          );
        }
        if (draft.paymentsToDelete.length > 0) {
          fd.set("paymentsToDelete", JSON.stringify(draft.paymentsToDelete));
        }

        if (draft.guaranteeDocsToDelete.length > 0) {
          fd.set("guaranteeDocsToDelete", JSON.stringify(draft.guaranteeDocsToDelete));
        }
        if (draft.guaranteeDocType) fd.set("guaranteeDocType", draft.guaranteeDocType);
        if (draft.guaranteeFile) fd.set("guaranteeFile", draft.guaranteeFile);
        if (draft.guaranteeSelfie) fd.set("guaranteeSelfie", draft.guaranteeSelfie);

        if (draft.returnComplete) fd.set("returnComplete", "1");
        if (draft.returnConditions.length > 0) fd.set("returnConditions", JSON.stringify(draft.returnConditions));
        if (draft.returnNotes.trim()) fd.set("returnNotes", draft.returnNotes.trim());
        for (const photo of draft.returnPhotos) fd.append("returnPhotos", photo);
        if (draft.returnPhotosToDelete.length > 0) {
          fd.set("returnPhotosToDelete", JSON.stringify(draft.returnPhotosToDelete));
        }

        return fd;
      },
    };
  }, [draft]);

  return <OrderDraftContext.Provider value={value}>{children}</OrderDraftContext.Provider>;
}

export function useOrderDraft(): OrderDraftValue {
  const ctx = React.useContext(OrderDraftContext);
  if (!ctx) {
    throw new Error("useOrderDraft harus dipakai di dalam <OrderDraftProvider>");
  }
  return ctx;
}

export function useOptionalOrderDraft(): OrderDraftValue | null {
  return React.useContext(OrderDraftContext);
}
