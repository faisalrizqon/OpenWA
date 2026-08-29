import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EditUserForm } from "@/components/EditUserForm";

export default async function EditUserPage({
  params,
}: PageProps<"/admin/users/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Pengguna"
        description={user.email}
        backHref="/admin/users"
      />
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription>
            Ubah data, peran, atau reset kata sandi. Kosongkan kata sandi untuk mempertahankan yang lama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditUserForm
            user={{ id: user.id, name: user.name, email: user.email, role: user.role }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
