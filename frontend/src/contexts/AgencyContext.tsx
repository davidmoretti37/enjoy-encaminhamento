import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface Agency {
  id: string;
  name: string;
  city: string | null;
}

interface AgencyContextType {
  currentAgency: Agency | null;
  availableAgencies: Agency[];
  isLoading: boolean;
  isAllAgenciesMode: boolean;
  setCurrentAgency: (agencyId: string | null) => void;
}

const STORAGE_KEY = "admin_agency_context";

const AgencyContext = createContext<AgencyContextType | undefined>(undefined);

function loadFromStorage(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(agencyId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agencyId));
  } catch {
    // ignore storage errors
  }
}

export function AgencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Client-side state — source of truth for UI
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(() => loadFromStorage());

  // Get available agencies from server
  const { data: availableAgencies = [], isLoading: isLoadingAgencies } =
    trpc.agencyContext.getAvailable.useQuery(undefined, {
      enabled: isAdmin,
    });

  // Best-effort server persistence (fire and forget — doesn't affect UI)
  const setCurrentMutation = trpc.agencyContext.setCurrent.useMutation({
    onError: (error) => {
      console.warn('[AgencyContext] Server persistence failed (non-blocking):', error.message);
    },
  });

  // Resolve the selected agency ID to a full agency object
  const currentAgency = selectedAgencyId
    ? availableAgencies.find(a => a.id === selectedAgencyId) || null
    : null;

  const setCurrentAgency = useCallback((agencyId: string | null) => {
    setSelectedAgencyId(agencyId);
    saveToStorage(agencyId);
    // Best-effort server persistence
    setCurrentMutation.mutate({ agencyId });
  }, [setCurrentMutation]);

  // If the stored agency ID is not in the available list (e.g., agency was deleted), reset
  useEffect(() => {
    if (
      selectedAgencyId &&
      availableAgencies.length > 0 &&
      !availableAgencies.find(a => a.id === selectedAgencyId)
    ) {
      setSelectedAgencyId(null);
      saveToStorage(null);
    }
  }, [selectedAgencyId, availableAgencies]);

  const value: AgencyContextType = {
    currentAgency,
    availableAgencies,
    isLoading: isLoadingAgencies,
    isAllAgenciesMode: currentAgency === null,
    setCurrentAgency,
  };

  return (
    <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>
  );
}

export function useAgencyContext() {
  const context = useContext(AgencyContext);
  if (context === undefined) {
    throw new Error("useAgencyContext must be used within an AgencyProvider");
  }
  return context;
}
