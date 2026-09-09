import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  if (await currentSession()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="eyebrow text-paper/50">Off Grid</p>
        <h1 className="mt-4 text-2xl font-light">Operations console</h1>
        <div className="mt-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
