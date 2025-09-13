// src/router/useQueryLocation.ts
import { useEffect, useState } from "react";

type NavigateOptions = { replace?: boolean };

export function useQueryLocation(): [
  string,
  (to: string, opts?: NavigateOptions) => void
] {
  const getLoc = () => window.location.pathname + window.location.search;

  const [loc, setLoc] = useState<string>(getLoc());

  useEffect(() => {
    const onPopState = () => setLoc(getLoc());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (to: string, opts?: NavigateOptions) => {
    if (opts?.replace) window.history.replaceState({}, "", to);
    else window.history.pushState({}, "", to);
    // tell React we “navigated”
    setLoc(getLoc());
  };

  return [loc, navigate];
}
