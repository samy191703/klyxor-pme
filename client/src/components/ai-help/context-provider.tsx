import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface HelpContext {
  page: string;
  section: string;
  userAction?: string;
  data?: any;
}

interface AIHelpContextType {
  context: HelpContext;
  updateContext: (updates: Partial<HelpContext>) => void;
  setPage: (page: string) => void;
  setSection: (section: string) => void;
  setUserAction: (action: string) => void;
  setData: (data: any) => void;
}

const AIHelpContext = createContext<AIHelpContextType | null>(null);

interface AIHelpProviderProps {
  children: ReactNode;
  initialPage: string;
}

export function AIHelpProvider({ children, initialPage }: AIHelpProviderProps) {
  const [context, setContext] = useState<HelpContext>({
    page: initialPage,
    section: "main",
  });

  const updateContext = (updates: Partial<HelpContext>) => {
    setContext(prev => ({ ...prev, ...updates }));
  };

  const setPage = (page: string) => {
    updateContext({ page, section: "main", userAction: undefined });
  };

  const setSection = (section: string) => {
    updateContext({ section });
  };

  const setUserAction = (userAction: string) => {
    updateContext({ userAction });
  };

  const setData = (data: any) => {
    updateContext({ data });
  };

  return (
    <AIHelpContext.Provider 
      value={{ 
        context, 
        updateContext, 
        setPage, 
        setSection, 
        setUserAction, 
        setData 
      }}
    >
      {children}
    </AIHelpContext.Provider>
  );
}

export function useAIHelp() {
  const context = useContext(AIHelpContext);
  if (!context) {
    throw new Error('useAIHelp must be used within an AIHelpProvider');
  }
  return context;
}

// Hook pour automatiser les mises à jour de contexte
export function useHelpSection(section: string) {
  const { setSection } = useAIHelp();
  
  useEffect(() => {
    setSection(section);
  }, [section, setSection]);
}

export function useHelpAction(action: string, dependency?: any) {
  const { setUserAction } = useAIHelp();
  
  useEffect(() => {
    if (dependency !== undefined) {
      setUserAction(action);
    }
  }, [action, dependency, setUserAction]);
}