"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import * as React from "react";

import { apiGet, apiPost, ApiRequestError } from "@/lib/api-client";
import { BrandLogo } from "@/components/ui/brand-logo";
import type { OidcProviderPublic } from "@/lib/types";

const BRAND = "#E1251B";
const INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 ps-9 pe-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#E1251B] focus:bg-white focus:ring-2 focus:ring-[#E1251B]/20 disabled:opacity-60";

interface LoginResult {
  mfa_required?: boolean;
  user?: { email: string };
}

interface KeycloakConfig {
  enabled: boolean;
  login_path: string;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/workspace";
  // For SSO logins, return to THIS app's origin after Keycloak (allow-listed on the
  // backend via SSO_EXTRA_ORIGINS). Falls back to the path during SSR.
  const ssoNext =
    typeof window !== "undefined" ? `${window.location.origin}${next}` : next;

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [mfaStage, setMfaStage] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [providers, setProviders] = React.useState<OidcProviderPublic[]>([]);
  const [kc, setKc] = React.useState<KeycloakConfig | null>(null);
  const [showPw, setShowPw] = React.useState(false);

  React.useEffect(() => {
    apiGet<OidcProviderPublic[]>("/auth/oidc/providers")
      .then(setProviders)
      .catch(() => setProviders([]));
    apiGet<KeycloakConfig>("/auth/keycloak/config")
      .then((cfg) => setKc(cfg.enabled ? cfg : null))
      .catch(() => setKc(null));
    const err = params.get("error");
    if (err === "sso_failed") {
      setError("Single sign-on failed. Please try again or use your password.");
    } else if (err === "keycloak_failed") {
      setError("Keycloak sign-in failed. Please try again or use your password.");
    }
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: Record<string, string> = { email, password };
      if (mfaStage && otp) body.otp = otp;
      const res = await apiPost<LoginResult>("/auth/login", body);
      if (res.mfa_required) {
        setMfaStage(true);
        setError(null);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.error.message);
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
      <p className="mt-1 text-sm" style={{ color: BRAND }}>Sign in to continue to your workspace</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-slate-700">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email" type="email" autoComplete="username" required placeholder="name@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={mfaStage}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password" type={showPw ? "text" : "password"} autoComplete="current-password" required
              placeholder="Enter your password"
              value={password} onChange={(e) => setPassword(e.target.value)} disabled={mfaStage}
              className={`${INPUT_CLASS} pe-10`}
            />
            <button
              type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {!mfaStage && (
            <div className="flex justify-end">
              <span className="cursor-pointer text-xs font-medium hover:underline" style={{ color: BRAND }}>
                Forgot password?
              </span>
            </div>
          )}
        </div>

        {mfaStage && (
          <div className="space-y-1.5">
            <label htmlFor="otp" className="text-xs font-semibold text-slate-700">Authentication code</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="otp" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" required autoFocus
                value={otp} onChange={(e) => setOtp(e.target.value)} className={INPUT_CLASS}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #E1251B 0%, #c01d16 70%, #a5170f 100%)" }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mfaStage ? "Verify" : "Sign In"}
          {!loading && !mfaStage && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      {!mfaStage && (providers.length > 0 || kc) && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or continue with
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          {providers.map((p) => (
            <button
              key={p.slug} type="button"
              onClick={() => { window.location.href = `${p.login_path}?next=${encodeURIComponent(ssoNext)}`; }}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <BrandLogo vendor={`${p.name} ${p.slug}`} size={18} fallback="none" />
              {p.name}
            </button>
          ))}
          {kc && (
            <button
              key="keycloak" type="button"
              onClick={() => { window.location.href = `${kc.login_path}?next=${encodeURIComponent(ssoNext)}`; }}
              className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <BrandLogo vendor="keycloak" size={18} fallback="none" />
              Sign in with Keycloak
            </button>
          )}
        </div>
      )}
    </div>
  );
}
