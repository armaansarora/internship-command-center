import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/LegalDocument";
import { PRIVACY_POLICY } from "@/lib/legal/privacy";
import { GATE_CONFIG } from "@/lib/config/gate-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${GATE_CONFIG.brand.name} handles your data.`,
  alternates: { canonical: `${GATE_CONFIG.brand.url()}/privacy` },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      revisedOn={PRIVACY_POLICY.revisedOn}
      sections={PRIVACY_POLICY.sections}
    />
  );
}
