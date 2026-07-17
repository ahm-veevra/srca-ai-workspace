"use client";

import * as React from "react";

const KEY = "veevra-config-mode";
type Mode = "simple" | "advanced";

/** Per-form Simple/Advanced preference, persisted in localStorage. Simple is the default;
 * Advanced reveals raw/expert fields. Read once on mount so it carries across forms. */
export function useConfigMode() {
  const [mode, setMode] = React.useState<Mode>("simple");
  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "advanced" || v === "simple") setMode(v);
    } catch {
      /* ignore */
    }
  }, []);
  const update = React.useCallback((m: Mode) => {
    setMode(m);
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
  }, []);
  return { mode, advanced: mode === "advanced", setMode: update };
}

const WKEY = "veevra-workspace-mode";
export type WorkspaceMode = "simple" | "advanced" | "architect";

/** Global workspace mode that adapts navigation depth. Simple is the default and hides the
 * technical/architecture surface; Architect reveals everything. */
export function useWorkspaceMode() {
  const [mode, setMode] = React.useState<WorkspaceMode>("simple");
  React.useEffect(() => {
    try {
      const v = window.localStorage.getItem(WKEY);
      if (v === "simple" || v === "advanced" || v === "architect") setMode(v);
    } catch {
      /* ignore */
    }
  }, []);
  const update = React.useCallback((m: WorkspaceMode) => {
    setMode(m);
    try {
      window.localStorage.setItem(WKEY, m);
      window.dispatchEvent(new Event("veevra-workspace-mode"));
    } catch {
      /* ignore */
    }
  }, []);
  // Keep instances in sync within the tab.
  React.useEffect(() => {
    const sync = () => {
      try {
        const v = window.localStorage.getItem(WKEY);
        if (v === "simple" || v === "advanced" || v === "architect") setMode(v);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("veevra-workspace-mode", sync);
    return () => window.removeEventListener("veevra-workspace-mode", sync);
  }, []);
  return { mode, setMode: update };
}

const PKEY = "veevra-persona";

/** The chosen role-based experience. Selecting a persona also sets the workspace mode to
 * that persona's depth. Persisted in localStorage; stays in sync within the tab. */
export function usePersona() {
  const [persona, setPersona] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      setPersona(window.localStorage.getItem(PKEY));
    } catch {
      /* ignore */
    }
  }, []);
  const choose = React.useCallback((key: string, mode: WorkspaceMode) => {
    setPersona(key);
    try {
      window.localStorage.setItem(PKEY, key);
      window.localStorage.setItem(WKEY, mode);
      window.dispatchEvent(new Event("veevra-workspace-mode"));
      window.dispatchEvent(new Event("veevra-persona"));
    } catch {
      /* ignore */
    }
  }, []);
  React.useEffect(() => {
    const sync = () => {
      try {
        setPersona(window.localStorage.getItem(PKEY));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("veevra-persona", sync);
    return () => window.removeEventListener("veevra-persona", sync);
  }, []);
  return { persona, choose };
}

export function ModeToggle({
  mode,
  setMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-border text-xs">
      {(["simple", "advanced"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={`px-2.5 py-1 capitalize transition-colors ${
            mode === m ? "bg-primary text-primary-foreground" : "bg-surface-1 text-muted-foreground"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
