import { redirect } from "next/navigation";

/**
 * The interface opens this as a modal over the list behind it, via the
 * intercepting route in @modal. This file is the non-intercepted match — what
 * a hard refresh, a typed URL or a bookmark would land on.
 *
 * The standalone form pages were dropped when everything moved to modals, so
 * rather than render one, send the visitor to the list the modal opens over.
 * The route itself has to keep existing: the intercept matches against it, so
 * deleting the file would take the modal down with it.
 */
export default async function EditFallback({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/students/${id}`);
}
