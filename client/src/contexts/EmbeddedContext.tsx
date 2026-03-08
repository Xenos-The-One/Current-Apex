/**
 * EmbeddedContext — tells child page components that they are being rendered
 * inside a hub page (ContactsHub, MarketingHub, etc.) and should skip their
 * own DashboardLayout wrapper.
 */
import { createContext, useContext, ReactNode } from "react";

const EmbeddedContext = createContext(false);

export function EmbeddedProvider({ children }: { children: ReactNode }) {
  return (
    <EmbeddedContext.Provider value={true}>
      {children}
    </EmbeddedContext.Provider>
  );
}

/** Returns true when the component is rendered inside a hub page. */
export function useIsEmbedded(): boolean {
  return useContext(EmbeddedContext);
}
