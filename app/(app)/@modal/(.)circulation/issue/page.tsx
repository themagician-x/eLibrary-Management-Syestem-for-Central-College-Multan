import Modal from "@/components/Modal";
import IssuePanel from "@/app/(app)/circulation/issue-panel";
import { getSettings } from "@/lib/settings";

export default async function InterceptedIssue() {
  const settings = await getSettings();
  return (
    <Modal title="Issue a book" subtitle="Loan a book to a student." maxWidthClass="lg:max-w-xl" overflowVisible>
      <IssuePanel loanDays={settings.loan_days} maxBooks={settings.max_books} />
    </Modal>
  );
}
