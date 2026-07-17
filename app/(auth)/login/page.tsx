import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{
        background:
          "radial-gradient(at 50% 0%, rgba(225,37,27,0.08) 0%, rgba(0,0,0,0) 45%)," +
          "radial-gradient(at 80% 90%, rgba(0,152,69,0.06) 0%, rgba(0,0,0,0) 45%), #0a0c10",
      }}
    >
      <div
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl md:grid-cols-[1.05fr_1fr]"
        style={{ minHeight: "min(540px, 92vh)" }}
      >
        {/* Brand panel */}
        <div
          className="relative hidden flex-col justify-between overflow-hidden p-8 md:flex"
          style={{ background: "linear-gradient(160deg, #201013, #17090b 60%, #100507)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(at 50% 18%, rgba(225,37,27,0.18) 0%, rgba(0,0,0,0) 55%)," +
                "radial-gradient(at 20% 92%, rgba(225,37,27,0.10) 0%, rgba(0,0,0,0) 42%)," +
                "radial-gradient(at 85% 60%, rgba(0,152,69,0.10) 0%, rgba(0,0,0,0) 42%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)," +
                "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          {/* brand */}
          <div className="relative flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/srca-mark.svg" alt="SRCA" className="h-full w-full object-contain" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              SRCA<span className="text-[#ff8f85]"> AI WORKSPACE</span>
            </span>
          </div>
          {/* center */}
          <div className="relative flex flex-col items-center text-center">
            <span className="relative mb-6 flex h-28 w-28 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: "rgba(225,37,27,0.30)" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/srca-mark.svg"
                alt="Saudi Red Crescent Authority"
                className="relative h-24 w-24 object-contain drop-shadow-xl"
              />
            </span>
            <h2 className="text-xl font-bold text-white">Intelligent Intranet Portal</h2>
            <p dir="rtl" className="mt-1.5 font-[var(--font-arabic)] text-sm text-white/70">
              هيئة الهلال الأحمر السعودي
            </p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff8f85]">
              Secure · Centralized · Intelligent
            </p>
          </div>
          {/* footer */}
          <p className="relative text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Powered by AICP
          </p>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center bg-white px-8 py-10 sm:px-10">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
