"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Global UI feedback — imperative toasts + a branded confirmation dialog. Replaces native
 * `alert()` / `confirm()` so every surface gives consistent, on-brand feedback and never blocks on
 * a browser chrome dialog. Mount <FeedbackRoot/> once (root layout); call `toast.*` / `confirmDialog`
 * from anywhere.
 */

// ── Toasts ────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let _toasts: ToastItem[] = [];
const _toastSubs = new Set<() => void>();
let _seq = 1;
const _emitToasts = () => _toastSubs.forEach((f) => f());

function pushToast(type: ToastType, message: string) {
  const id = _seq++;
  _toasts = [..._toasts, { id, type, message }];
  _emitToasts();
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id);
    _emitToasts();
  }, 5000);
}

export const toast = {
  success: (message: string) => pushToast("success", message),
  error: (message: string) => pushToast("error", message),
  info: (message: string) => pushToast("info", message),
};

// ── Confirmation dialog ─────────────────────────────────────────────────────────
export interface ConfirmOpts {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger styling on the confirm button (default true — most confirms are destructive). */
  danger?: boolean;
}
interface ConfirmState extends ConfirmOpts {
  id: number;
  resolve: (v: boolean) => void;
}

let _confirm: ConfirmState | null = null;
const _confirmSubs = new Set<() => void>();
const _emitConfirm = () => _confirmSubs.forEach((f) => f());

/** Show a branded confirmation. Resolves true if confirmed, false if cancelled/dismissed. */
export function confirmDialog(opts: string | ConfirmOpts): Promise<boolean> {
  const o: ConfirmOpts = typeof opts === "string" ? { message: opts } : opts;
  return new Promise((resolve) => {
    _confirm = { id: _seq++, danger: true, ...o, resolve };
    _emitConfirm();
  });
}

function closeConfirm(result: boolean) {
  const s = _confirm;
  _confirm = null;
  _emitConfirm();
  s?.resolve(result);
}

// ── Rendering ───────────────────────────────────────────────────────────────────
const TOAST_STYLE: Record<ToastType, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "border-success/40 text-success" },
  error: { icon: XCircle, cls: "border-danger/40 text-danger" },
  info: { icon: Info, cls: "border-border text-foreground" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const { icon: Icon, cls } = TOAST_STYLE[item.type];
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-2 rounded-md border bg-surface-2 px-3 py-2.5 text-sm shadow-elevated",
        cls,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-foreground">{item.message}</span>
    </div>
  );
}

function ConfirmModal({ state }: { state: ConfirmState }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeConfirm(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={() => closeConfirm(false)}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border-strong bg-surface-2 p-6 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {state.danger !== false && (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {state.title ?? "Please confirm"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          </div>
          <button
            onClick={() => closeConfirm(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => closeConfirm(false)}>
            {state.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={state.danger !== false ? "destructive" : "default"}
            onClick={() => closeConfirm(true)}
            autoFocus
          >
            {state.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FeedbackRoot() {
  const toasts = React.useSyncExternalStore(
    (cb) => {
      _toastSubs.add(cb);
      return () => _toastSubs.delete(cb);
    },
    () => _toasts,
    () => _toasts,
  );
  const confirm = React.useSyncExternalStore(
    (cb) => {
      _confirmSubs.add(cb);
      return () => _confirmSubs.delete(cb);
    },
    () => _confirm,
    () => _confirm,
  );
  return (
    <>
      <div className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} />
        ))}
      </div>
      {confirm && <ConfirmModal state={confirm} />}
    </>
  );
}
