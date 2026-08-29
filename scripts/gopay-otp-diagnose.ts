/**
 * Diagnostik OTP GoPay/GoBiz Merchant — menampilkan respons MENTAH dari
 * endpoint GoID agar jelas kenapa OTP tidak masuk.
 *
 * Run: npx tsx scripts/gopay-otp-diagnose.ts <nomor_hp>
 * Contoh: npx tsx scripts/gopay-otp-diagnose.ts 081234567890
 *
 * Memakai fetch native; meniru header persis login.js gopay-gateway
 * (hasil intercept), jadi hasilnya identik dengan `node login.js`.
 */

interface GoidOtpResponse {
  code?: number;
  message?: string;
  data?: {
    otp_token?: string;
    token?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

async function requestOtp(phoneNumber: string): Promise<void> {
  const subscriber = normalizePhone(phoneNumber);
  if (!subscriber.startsWith("8") || subscriber.length < 9) {
    console.error(`❌ Nomor tidak valid: ${phoneNumber}`);
    process.exit(1);
  }

  const deviceId = crypto.randomUUID();
  const body = {
    client_id: "go-biz-web-new",
    phone_number: subscriber,
    country_code: "62",
  };

  console.log("=".repeat(64));
  console.log("🔬 Diagnostik OTP GoPay/GoBiz Merchant");
  console.log("=".repeat(64));
  console.log(`Nomor tujuan : +62${subscriber} (${subscriber.slice(0, 4)}***${subscriber.slice(-2)})`);
  console.log(`Endpoint     : POST https://api.gobiz.co.id/goid/login/request`);
  console.log(`Device ID    : ${deviceId}`);
  console.log(`Waktu        : ${new Date().toISOString()}`);
  console.log("");

  const startedAt = Date.now();
  try {
    const res = await fetch("https://api.gobiz.co.id/goid/login/request", {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "accept-language": "id",
        "authentication-type": "go-id",
        "gojek-country-code": "ID",
        "gojek-timezone": "Asia/Jakarta",
        origin: "https://portal.gofoodmerchant.co.id",
        referer: "https://portal.gofoodmerchant.co.id/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "x-appid": "go-biz-web-dashboard",
        "x-appversion": "platform-v3.111.0-1708bc9a",
        "x-deviceos": "Web",
        "x-phonemake": "Windows 10 64-bit",
        "x-phonemodel": "Chrome 150.0.0.0 on Windows 10 64-bit",
        "x-platform": "Web",
        "x-uniqueid": deviceId,
        "x-user-locale": "id",
        "x-user-type": "merchant",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });

    const elapsed = Date.now() - startedAt;
    const text = await res.text();
    console.log(`⏱  HTTP ${res.status} dalam ${elapsed}ms`);
    console.log("");

    let parsed: GoidOtpResponse | null = null;
    try {
      parsed = JSON.parse(text) as GoidOtpResponse;
    } catch {
      console.log("Respons bukan JSON (kemungkinan diblokir WAF/proxy):");
      console.log(text.slice(0, 500));
      return;
    }

    console.log("Respons API (tanpa otp_token):");
    console.log(JSON.stringify({ ...parsed, data: parsed?.data ? { ...parsed.data, otp_token: parsed.data.otp_token ? "<ada>" : undefined } : undefined }, null, 2));
    console.log("");

    const otpToken = parsed?.data?.otp_token ?? parsed?.data?.token;
    if (res.ok && otpToken) {
      console.log("✅ API BERHASIL menerima permintaan OTP.");
      console.log("");
      console.log("Artinya: OTP sudah dikirim oleh GoPay dari sisi mereka.");
      console.log("Jika TIDAK sampai di HP Anda:");
      console.log("  1. Cek WhatsApp — GoPay sering kirim kode lewat WA (dari akun");
      console.log("     bisnis Gojek/GoPay), BUKAN SMS. Cari chat 'Gojek'/'GoPay'.");
      console.log("  2. Cek folder SMS spam/terblokir di aplikasi pesan.");
      console.log("  3. Beberapa operator (terutama nomor virtual/VoIP) memblokir");
      console.log("     SMS OTP — coba nomor lain yang beda operator.");
      console.log("  4. Tunggu 5 menit lalu jalankan ulang (rate-limit GoPay).");
      console.log("  5. Kalau pakai nomor yang sama berulang kali gagal, GoPay bisa");
      console.log("     menahan OTP sementara (cooldown 15-60 menit).");
      console.log("");
      console.log("Setelah kode sampai, lanjutkan login di terminal gateway:");
      console.log("  cd gopay-gateway && node login.js");
    } else {
      console.log("❌ API MENOLAK permintaan OTP — ini penyebabnya:");
      console.log("");
      const msg = parsed?.message ?? "";
      if (/captcha/i.test(text)) {
        console.log("→ GoPay meminta verifikasi CAPTCHA. Buka https://merchant.gopay.co.id");
        console.log("  di browser, login manual sekali untuk 'membersihkan' flag, lalu coba lagi.");
      } else if (/not (found|registered)|unregistered|invalid phone|no.*account/i.test(msg + text)) {
        console.log("→ Nomor TIDAK terdaftar sebagai akun GoBiz/GoPay Merchant.");
        console.log("  Pastikan nomor ini yang terdaftar di aplikasi GoPay Merchant Anda");
        console.log("  (cek di aplikasi: Profil > Nomor HP).");
      } else if (/limit|frequent|too many|cooldown/i.test(msg + text)) {
        console.log("→ Rate-limit: terlalu banyak permintaan OTP. Tunggu 15-60 menit.");
      } else {
        console.log("→ Lihat pesan error di atas. Jika 'unauthorized'/'forbidden',");
        console.log("  endpoint privat mungkin berubah — laporkan hasil ini.");
      }
    }
  } catch (err) {
    const elapsed = Date.now() - startedAt;
    console.log(`❌ Gagal setelah ${elapsed}ms: ${err instanceof Error ? err.message : String(err)}`);
    console.log("");
    console.log("Kemungkinan: koneksi internet terblokir ke api.gobiz.co.id,");
    console.log("atau timeout. Coba: curl -I https://api.gobiz.co.id");
  }
}

const phone = process.argv[2];
if (!phone) {
  console.log("Usage: npx tsx scripts/gopay-otp-diagnose.ts <nomor_hp>");
  console.log("Contoh: npx tsx scripts/gopay-otp-diagnose.ts 081234567890");
  process.exit(1);
}

void requestOtp(phone);
