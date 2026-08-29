import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateUserForm } from "@/components/UserAdminActions";

export default async function NewUserPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tambah Pengguna"
        description="Buat akun admin atau mitra baru"
        backHref="/admin/users"
      />
      <Card>
        <CardHeader>
          <CardTitle>User Baru</CardTitle>
          <CardDescription>
            Mitra: operasional (order, return, customer) · Admin: akses penuh termasuk laporan & harga
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
