"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string; lockedUntil?: string };

/** "30 seconds" / "2 minutes" — for the lockout message. */
function humanWait(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();

  // already locked out from earlier failures? don't even try the password
  const { data: waiting } = await supabase.rpc("login_wait", { p_email: email });
  const wait = Number(waiting ?? 0);
  if (wait > 0) {
    return {
      error: `Too many failed attempts. Try again in ${humanWait(wait)}.`,
      lockedUntil: new Date(Date.now() + wait * 1000).toISOString(),
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  const { data: locked } = await supabase.rpc("login_record", {
    p_email: email,
    p_ok: !error,
  });

  if (error) {
    const lockedFor = Number(locked ?? 0);
    if (lockedFor > 0) {
      return {
        error: `Too many failed attempts. Try again in ${humanWait(lockedFor)}.`,
        lockedUntil: new Date(Date.now() + lockedFor * 1000).toISOString(),
      };
    }
    return { error: "Those credentials didn't match. Please try again." };
  }

  redirect("/");
}
