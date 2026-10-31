import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="stack">
      <h1>Sign up</h1>
      <p className="muted">
        Creates a new account in this notebook app only. Pick any username you like.
      </p>
      <AuthForm mode="signup" />
      <p className="muted">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
