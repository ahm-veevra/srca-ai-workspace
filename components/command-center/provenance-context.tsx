"use client";

import * as React from "react";

import type { ProvenanceRuntime } from "@/lib/command-center-provenance";

const ProvenanceCtx = React.createContext<ProvenanceRuntime>({
  connectorId: "",
});

/** Supplies the runtime AICP config (connector id, collection, capability) to every
 *  ProvenanceButton in the command center, so lineage popovers reflect live settings. */
export function ProvenanceProvider({
  value,
  children,
}: {
  value: ProvenanceRuntime;
  children: React.ReactNode;
}) {
  return <ProvenanceCtx.Provider value={value}>{children}</ProvenanceCtx.Provider>;
}

export function useProvenanceRuntime(): ProvenanceRuntime {
  return React.useContext(ProvenanceCtx);
}
