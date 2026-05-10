import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/LegalDocument";
import { TERMS_OF_SERVICE } from "@/lib/legal/terms";
import { GATE_CONFIG } from "@/lib/config/gate-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${GATE_CONFIG.brand.name}.`,
  alternates: { canonical: `${GATE_CONFIG.brand.url()}/terms` },
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      revisedOn={TERMS_OF_SERVICE.revisedOn}
      sections={TERMS_OF_SERVICE.sections}
    />
  );
}
