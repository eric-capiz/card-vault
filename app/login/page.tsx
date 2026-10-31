import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="stack">
      <h1>Log in</h1>
      <p className="muted">Use your existing login — same username and password.</p>
      <AuthForm mode="login" />
      <p className="muted">
        No account here yet? <Link href="/signup">Sign up</Link> — it only creates
        an account in this app and never touches any other app&apos;s data.
      </p>
    </div>
  );
}
