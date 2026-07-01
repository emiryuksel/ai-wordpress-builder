import { redirect } from "next/navigation";

import AdminShell from "@/app/admin/admin-shell";
import { getAdminUser } from "@/lib/admin-auth";
import { toPublicUser } from "@/lib/user-store";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/");
  }

  return <AdminShell user={toPublicUser(admin)}>{children}</AdminShell>;
}
