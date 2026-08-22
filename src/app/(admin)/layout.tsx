import { Sidebar } from "@/components/Sidebar";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-10 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
