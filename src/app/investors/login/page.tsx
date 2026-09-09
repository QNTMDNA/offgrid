import { redirect } from "next/navigation";
import { currentInvestor } from "@/lib/investors/session";
import { InvestorSignInForm } from "@/components/investors/sign-in-form";

export const dynamic = "force-dynamic";

export default async function InvestorLoginPage() {
  if (await currentInvestor()) redirect("/investors");

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-24">
      <p className="eyebrow text-paper/50">Private</p>
      <h1 className="mt-4 text-2xl font-light">Investor room</h1>
      <p className="mt-4 text-sm text-paper/50">
        Enter the email and passcode issued to you. Access is logged.
      </p>
      <div className="mt-10">
        <InvestorSignInForm />
      </div>
      <p className="mt-8 text-xs text-paper/40">
        Lost your passcode? Email investors@offgridrace.com and we will reissue it.
      </p>
    </div>
  );
}
