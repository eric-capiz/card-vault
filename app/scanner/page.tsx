import dynamic from "next/dynamic";

const ScannerClient = dynamic(() => import("./ScannerClient"), {
  ssr: false,
  loading: () => <div className="pt-24 text-center text-slate-400">Loading scanner…</div>,
});

export default function ScannerPage() {
  return <ScannerClient />;
}
