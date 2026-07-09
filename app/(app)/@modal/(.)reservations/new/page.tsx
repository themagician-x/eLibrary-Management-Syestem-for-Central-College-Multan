import Modal from "@/components/Modal";
import ReservePanel from "@/app/(app)/reservations/reserve-panel";

export default function InterceptedHold() {
  return (
    <Modal title="Place a hold" subtitle="Reserve a book for a student." maxWidthClass="lg:max-w-xl" overflowVisible>
      <ReservePanel />
    </Modal>
  );
}
