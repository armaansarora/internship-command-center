import { getCompanies } from "@/lib/research-queries";
import { ResearchLayout } from "@/components/research/research-layout";

export default async function ResearchPage() {
  const companies = await getCompanies();

  return (
    <div className="h-[calc(100vh-2rem)]">
      <ResearchLayout initialCompanies={companies} />
    </div>
  );
}
