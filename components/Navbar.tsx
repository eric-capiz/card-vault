"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Navbar() {
  const router = useRouter();
  const [display, setDisplay] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setDisplay(d.user ? d.user.display : null))
      .catch(() => setDisplay(null))
      .finally(() => setLoaded(true));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">Notebook</Link>
      <Link href="/search">Search</Link>
      <span className="nav-spacer" />
      {loaded && display ? (
        <>
          <span className="nav-user">{display}</span>
          <button className="btn btn-small" onClick={logout}>Log out</button>
        </>
      ) : loaded ? (
        <>
          <Link href="/login">Log in</Link>
          <Link href="/signup">Sign up</Link>
        </>
      ) : null}
    </nav>
  );
}
