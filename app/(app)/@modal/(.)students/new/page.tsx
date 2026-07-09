import Modal from "@/components/Modal";
import StudentForm from "@/app/(app)/students/student-form";
import { createStudent } from "@/app/(app)/students/actions";

export default function InterceptedNewStudent() {
  return (
    <Modal title="Register a student" subtitle="Add a new student record.">
      <StudentForm action={createStudent} submitLabel="Add student" />
    </Modal>
  );
}
