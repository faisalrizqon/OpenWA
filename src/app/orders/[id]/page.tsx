export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Detail Order</h1>
      <p className="mt-2 text-sm text-zinc-500">Order {id}</p>
    </div>
  );
}
