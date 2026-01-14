"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface ReaderContextType {
  isHeaderVisible: boolean;
  setIsHeaderVisible: (visible: boolean) => void;
  isReaderPage: boolean;
  setIsReaderPage: (isReader: boolean) => void;
  // Progress saving for mode switch - async to allow awaiting
  saveProgressCallback: (() => Promise<void>) | null;
  setSaveProgressCallback: (callback: (() => Promise<void>) | null) => void;
  // Store current location for persistence across remounts
  currentLocationForReload: string | null;
  setCurrentLocationForReload: (location: string | null) => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isReaderPage, setIsReaderPage] = useState(false);
  const [saveProgressCallback, setSaveProgressCallback] = useState<(() => Promise<void>) | null>(null);
  const [currentLocationForReload, setCurrentLocationForReload] = useState<string | null>(null);

  return (
    <ReaderContext.Provider value={{
      isHeaderVisible,
      setIsHeaderVisible,
      isReaderPage,
      setIsReaderPage,
      saveProgressCallback,
      setSaveProgressCallback,
      currentLocationForReload,
      setCurrentLocationForReload,
    }}>
      {children}
    </ReaderContext.Provider>
  );
}

export function useReaderContext() {
  const context = useContext(ReaderContext);
  if (context === undefined) {
    throw new Error("useReaderContext must be used within a ReaderProvider");
  }
  return context;
}
