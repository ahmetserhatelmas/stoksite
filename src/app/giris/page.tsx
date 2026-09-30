"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { login } from "@/actions/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    if (next) formData.set("next", next);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form
      action={handleSubmit}
      className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-bold text-[#1e3a5f]">Giriş Yap</h1>
      <p className="mt-1 text-sm text-slate-500">
        Admin ve kullanıcı aynı ekrandan giriş yapar.
      </p>
      <label className="mt-5 block text-sm">
        <span className="mb-1 block text-slate-600">Kullanıcı adı</span>
        <input
          name="username"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="admin"
          autoComplete="username"
        />
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1 block text-slate-600">Şifre</span>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </label>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="mt-5 w-full rounded-lg bg-[#1e3a5f] py-2.5 text-sm font-medium text-white hover:bg-[#152a45]"
      >
        {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
      <p className="mt-4 text-xs text-slate-400">
        Demo: admin / admin123 · user / user123
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Yükleniyor...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
