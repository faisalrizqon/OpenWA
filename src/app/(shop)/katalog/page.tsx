import { redirect } from "next/navigation";

/** `/katalog` kini menjadi halaman utama `/`. Jaga tautan lama tetap berfungsi. */
export default function KatalogRedirect() {
  redirect("/");
}
