import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy already guards this, but belt-and-suspenders for direct rendering
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar email={user.email ?? "admin"} />
      <main className="min-w-0 flex-1">{children}</main>
      {modal}
    </div>
  );
}
