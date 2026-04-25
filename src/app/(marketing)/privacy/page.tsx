import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/LegalDocument";
import { PRIVACY_POLICY } from "@/lib/legal/privacy";
import { LAUNCH_CONFIG } from "@/lib/launch-config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${LAUNCH_CONFIG.brand.name} handles your data.`,
  alternates: { canonical: `${LAUNCH_CONFIG.brand.url()}/privacy` },
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
