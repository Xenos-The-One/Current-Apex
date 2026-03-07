import { useAuth } from "@/_core/hooks/useAuth";
import { createContext, useContext, useState } from "react";

interface AgencyContextValue {
  agencyId: number;
  setAgencyId: (id: number) => void;
}

const AgencyContext = createContext<AgencyContextValue>({ agencyId: 1, setAgencyId: () => {} });

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const defaultId = (user as any)?.agencyId ?? 1;
  const [agencyId, setAgencyId] = useState<number>(defaultId);

  return (
    <AgencyContext.Provider value={{ agencyId, setAgencyId }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  return useContext(AgencyContext);
}
