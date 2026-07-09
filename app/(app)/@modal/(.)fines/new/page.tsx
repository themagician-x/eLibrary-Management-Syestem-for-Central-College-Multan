import Modal from "@/components/Modal";
import ChargePanel from "@/app/(app)/fines/charge-panel";

export default function InterceptedCharge() {
  return (
    <Modal title="Add a charge" subtitle="Bill a student for a lost or damaged book." maxWidthClass="lg:max-w-xl" overflowVisible>
      <ChargePanel />
    </Modal>
  );
}
