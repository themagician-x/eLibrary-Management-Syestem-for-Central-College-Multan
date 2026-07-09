"use client";

import { createContext, useContext, useEffect } from "react";

type ModalContext = {
  // lets a child form flag unsaved edits so the modal can guard closing
  setDirty: (dirty: boolean) => void;
  // present only inside a <Modal>; dismisses it (used after a successful save)
  close?: () => void;
};

const Ctx = createContext<ModalContext>({ setDirty: () => {} });

export const ModalProvider = Ctx.Provider;
export const useModal = () => useContext(Ctx);

/** Warn on tab close / refresh / hard navigation while there are unsaved edits. */
export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
