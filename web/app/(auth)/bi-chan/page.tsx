import type { Metadata } from "next";
import { Suspense } from "react";
import "@/styles/auth.css";
import { LeafArt } from "@/components/auth/LeafArt";
import { BrandCorner } from "@/components/auth/BrandCorner";
import { RateLimitedPanel } from "@/components/auth/RateLimitedPanel";

export const metadata: Metadata = {
  title: "Quá nhiều yêu cầu",
  robots: { index: false, follow: false },
};

export default function BiChanPage() {
  return (
    <section className="wm-login">
      <div className="card">
        <LeafArt />
        <BrandCorner />
        <Suspense fallback={<div className="form-panel" />}>
          <RateLimitedPanel />
        </Suspense>
      </div>
    </section>
  );
}
