/**
 * Internal build/QA surface gate (A73 / PRR-008).
 *
 * The coverage matrix, the 38-use-case runner, and the sales showcase are engineering/QA and
 * sales-demo tools. They expose AICP configuration and routing traces, so they must NOT be
 * reachable in a production business deployment — business users see the Centers, not the
 * platform's internals.
 *
 * Enabled in dev builds automatically; a production/staging deployment can opt in explicitly
 * with NEXT_PUBLIC_INTERNAL_TOOLS=1 (e.g. for a sales-demo environment).
 */
export function internalToolsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_INTERNAL_TOOLS === "1"
  );
}
