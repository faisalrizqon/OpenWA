// Test standalone untuk verifikasi storage external path + hash + cleanup
// Jalankan: npx tsx scripts/test-storage.ts
import { saveUpload, resolveStoragePath, deleteStoredFile, storageUrl } from "../src/lib/storage";
import { stat } from "fs/promises";
import path from "path";

async function main() {
  console.log("=== Test: saveUpload ke external storage ===");
  const bytes = Buffer.from("fake KTP image content for testing");
  const stored = await saveUpload("ktp", "test-1700000000.jpg", bytes);
  console.log("  filePath:", stored.filePath);
  console.log("  fileSize:", stored.fileSize);
  console.log("  fileHash:", stored.fileHash.substring(0, 20) + "...");
  console.log("  URL:", storageUrl(stored.filePath));

  // Verify file fisik ada di storage/ bukan public/uploads/
  const physicalPath = resolveStoragePath(stored.filePath);
  console.log("\n=== Test: resolveStoragePath ===");
  console.log("  resolved:", physicalPath);
  if (!physicalPath) throw new Error("FAIL: resolveStoragePath returned null");
  if (!physicalPath.includes("storage")) throw new Error("FAIL: not in storage dir");
  if (physicalPath.includes("public")) throw new Error("FAIL: still in public!");
  const stats = await stat(physicalPath);
  console.log("  file exists, size:", stats.size);
  if (stats.size !== stored.fileSize) throw new Error("FAIL: size mismatch");

  // Test path traversal protection
  console.log("\n=== Test: path traversal protection ===");
  const traversal = resolveStoragePath("/storage/../../etc/passwd");
  console.log("  traversal result:", traversal);
  if (traversal !== null) throw new Error("FAIL: path traversal NOT blocked!");
  console.log("  ✓ path traversal blocked");

  // Cleanup
  console.log("\n=== Test: deleteStoredFile ===");
  await deleteStoredFile(stored.filePath);
  try {
    await stat(physicalPath);
    throw new Error("FAIL: file still exists after delete");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("  ✓ file deleted successfully");
    } else {
      throw e;
    }
  }

  console.log("\n✅ ALL TESTS PASSED — storage external path berfungsi dengan baik");
}

main().catch((e) => {
  console.error("❌ TEST FAILED:", e);
  process.exit(1);
});
