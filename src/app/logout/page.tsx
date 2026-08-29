"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Logout page - sign out user dan redirect ke login page
 */
export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    // Call NextAuth signOut to clear session properly
    fetch("/api/auth/signout", { method: "POST" })
      .then(() => {
        // Redirect back to admin login with success message
        window.location.href = "/login?logout=success";
      })
      .catch((error) => {
        console.error("Logout failed:", error);
        window.location.href = "/login?logout=success";
      });
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Logging out...</p>
    </div>
  );
}
