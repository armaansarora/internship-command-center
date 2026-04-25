import type { Metadata } from "next";
import { LegalDocument } from "@/components/marketing/LegalDocument";
import { TERMS_OF_SERVICE } from "@/lib/legal/terms";
import { LAUNCH_CONFIG } from "@/lib/launch-config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of service for ${LAUNCH_CONFIG.brand.name}.`,
  alternates: { canonical: `${LAUNCH_CONFIG.brand.url()}/terms` },
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
