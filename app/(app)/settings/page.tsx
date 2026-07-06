import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import { getSettings } from "@/lib/settings";
import SettingsForm from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <PageShell title="Settings" subtitle="Library circulation rules.">
      <SettingsForm settings={settings} />
    </PageShell>
  );
}
