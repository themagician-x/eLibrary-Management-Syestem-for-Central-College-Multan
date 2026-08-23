import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import CommandPalette from "@/components/CommandPalette";

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
    <ToastProvider>
      {/* The viewport is the frame and <main> is the only thing that scrolls.
          That is what lets a table scroll inside its own box on a phone, and
          what stops the page sliding around behind the open nav drawer. */}
      <div className="flex h-dvh flex-col overflow-hidden lg:flex-row">
        <Sidebar email={user.email ?? "admin"} />
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
        {modal}
      </div>
      <CommandPalette />
    </ToastProvider>
  );
}
