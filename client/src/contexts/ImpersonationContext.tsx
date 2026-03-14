import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type ImpersonationViewMode = "admin" | "client";

type ImpersonationState = {
  /** The client ID being impersonated (null = no impersonation) */
  impersonatingClientId: number | null;
  /** The client name for display */
  impersonatingClientName: string | null;
  /**
   * "admin" = super admin keeps admin sidebar, just filters data to this client.
   * "client" = super admin sees the full client experience (client sidebar + client UX).
   */
  viewMode: ImpersonationViewMode | null;
  /** Start impersonating in admin-context mode (admin sidebar, filtered data) */
  startImpersonatingAsAdmin: (clientId: number, clientName: string) => void;
  /** Start impersonating in client-view mode (client sidebar + full client UX) */
  startImpersonatingAsClient: (clientId: number, clientName: string) => void;
  /** Stop impersonating entirely */
  stopImpersonating: () => void;
  /** Whether currently impersonating in any mode */
  isImpersonating: boolean;
  /** Whether currently in client-view mode */
  isClientViewMode: boolean;
  /** Whether currently in admin-context mode */
  isAdminViewMode: boolean;
  /** Legacy alias — defaults to admin-context mode */
  startImpersonating: (clientId: number, clientName: string) => void;
};

const ImpersonationContext = createContext<ImpersonationState>({
  impersonatingClientId: null,
  impersonatingClientName: null,
  viewMode: null,
  startImpersonatingAsAdmin: () => {},
  startImpersonatingAsClient: () => {},
  stopImpersonating: () => {},
  isImpersonating: false,
  isClientViewMode: false,
  isAdminViewMode: false,
  startImpersonating: () => {},
});

export const IMPERSONATION_STORAGE_KEY = "impersonating_client";
/** @deprecated use IMPERSONATION_STORAGE_KEY */
const STORAGE_KEY = IMPERSONATION_STORAGE_KEY;

/**
 * Synchronously removes the impersonation entry from localStorage.
 * Safe to call from any logout path — works outside of React context.
 */
export function clearImpersonationStorage(): void {
  try {
    localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable in SSR or restricted environments
  }
}

/**
 * Pass `currentUserId` so the provider can automatically clear impersonation
 * when the authenticated user changes (logout, session expiry, or account switch).
 */
export function ImpersonationProvider({
  children,
  currentUserId,
}: {
  children: ReactNode;
  currentUserId?: number | null;
}) {
  const [state, setState] = useState<{
    clientId: number | null;
    clientName: string | null;
    viewMode: ImpersonationViewMode | null;
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          clientId: parsed.clientId ?? null,
          clientName: parsed.clientName ?? null,
          viewMode: parsed.viewMode ?? "admin",
        };
      }
    } catch {}
    return { clientId: null, clientName: null, viewMode: null };
  });

  const startImpersonatingAsAdmin = useCallback((clientId: number, clientName: string) => {
    const next = { clientId, clientName, viewMode: "admin" as ImpersonationViewMode };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const startImpersonatingAsClient = useCallback((clientId: number, clientName: string) => {
    const next = { clientId, clientName, viewMode: "client" as ImpersonationViewMode };
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const stopImpersonating = useCallback(() => {
    setState({ clientId: null, clientName: null, viewMode: null });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Auto-clear impersonation when the authenticated user changes.
  // This covers: explicit logout, session expiry, and account switching.
  // We track the previous user ID so a switch from userA -> userB also clears state.
  const prevUserIdRef = React.useRef<number | null | undefined>(currentUserId);
  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = currentUserId;
    // Only act when the user ID actually changes (not on initial mount)
    if (prev === undefined) return; // first render — skip
    if (prev !== currentUserId) {
      // User logged out (null) or a different user logged in
      stopImpersonating();
    }
  }, [currentUserId, stopImpersonating]);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatingClientId: state.clientId,
        impersonatingClientName: state.clientName,
        viewMode: state.viewMode,
        startImpersonatingAsAdmin,
        startImpersonatingAsClient,
        stopImpersonating,
        isImpersonating: state.clientId !== null,
        isClientViewMode: state.clientId !== null && state.viewMode === "client",
        isAdminViewMode: state.clientId !== null && state.viewMode === "admin",
        startImpersonating: startImpersonatingAsAdmin,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
