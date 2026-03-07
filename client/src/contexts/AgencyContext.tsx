import { useAuth } from "@/_core/hooks/useAuth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface AgencyContextValue {
  agencyId: number;
  setAgencyId: (id: number) => void;
}

const AgencyContext = createContext<AgencyContextValue>({ agencyId: 0, setAgencyId: () => {} });

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [overrideId, setOverrideId] = useState<number | null>(null);

  // When user loads, clear any override so we use the real agencyId
  useEffect(() => {
    if (!loading && user) {
      setOverrideId(null);
    }
  }, [loading, user]);

  const agencyId = useMemo(() => {
    if (overrideId !== null) return overrideId;
    const uid = (user as any)?.agencyId;
    if (uid && typeof uid === "number" && uid > 0) return uid;
    // Super admins and admins without an agency default to 1 (the first agency)
    const role = (user as any)?.role;
    if (role === "super_admin" || role === "admin") return 1;
    return 0;
  }, [user, overrideId]);

  const setAgencyId = (id: number) => setOverrideId(id);

  return (
    <AgencyContext.Provider value={{ agencyId, setAgencyId }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  return useContext(AgencyContext);
}
