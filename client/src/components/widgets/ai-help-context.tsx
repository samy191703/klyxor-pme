import { createContext, useContext, useState, ReactNode } from "react";

interface AIHelpContextType {
  page: string;
  setPage: (page: string) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

const AIHelpContext = createContext<AIHelpContextType | undefined>(undefined);

export function AIHelpProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  return (
    <AIHelpContext.Provider value={{ page, setPage, showHelp, setShowHelp }}>
      {children}
    </AIHelpContext.Provider>
  );
}

export function useAIHelp() {
  const context = useContext(AIHelpContext);
  if (!context) {
    throw new Error("useAIHelp must be used within an AIHelpProvider");
  }
  return context;
}