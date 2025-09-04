import { createContext, useContext, useState, ReactNode } from "react";

export type ModalType = 
  | "confirm"
  | "reject"
  | "detail"
  | "form"
  | "info"
  | "gdpr"
  | "user-details"
  | "log-details"
  | "validation"
  | "transfer"
  | "bulk-action";

interface ModalState {
  type: ModalType | null;
  isOpen: boolean;
  data?: any;
  onConfirm?: (data?: any) => void;
  onCancel?: () => void;
}

interface ModalContextType {
  modalState: ModalState;
  openModal: (type: ModalType, data?: any, onConfirm?: (data?: any) => void, onCancel?: () => void) => void;
  closeModal: () => void;
  confirmModal: (data?: any) => void;
  cancelModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalState, setModalState] = useState<ModalState>({
    type: null,
    isOpen: false,
    data: undefined,
    onConfirm: undefined,
    onCancel: undefined
  });

  const openModal = (
    type: ModalType, 
    data?: any, 
    onConfirm?: (data?: any) => void, 
    onCancel?: () => void
  ) => {
    setModalState({
      type,
      isOpen: true,
      data,
      onConfirm,
      onCancel
    });
  };

  const closeModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
    // Reset après animation
    setTimeout(() => {
      setModalState({
        type: null,
        isOpen: false,
        data: undefined,
        onConfirm: undefined,
        onCancel: undefined
      });
    }, 200);
  };

  const confirmModal = (data?: any) => {
    if (modalState.onConfirm) {
      modalState.onConfirm(data);
    }
    closeModal();
  };

  const cancelModal = () => {
    if (modalState.onCancel) {
      modalState.onCancel();
    }
    closeModal();
  };

  return (
    <ModalContext.Provider value={{
      modalState,
      openModal,
      closeModal,
      confirmModal,
      cancelModal
    }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}