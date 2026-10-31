"use client";

export function PrintButton() {
  return (
    <button className="btn btn-primary no-print" onClick={() => window.print()}>
      Print / Save as PDF
    </button>
  );
}
