import { Suspense } from "react";
import { SearchResults } from "@/components/SearchResults";

export default function SearchPage() {
  return (
    <div className="stack">
      <h1>Search</h1>
      <Suspense fallback={<p className="muted">Loading…</p>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
