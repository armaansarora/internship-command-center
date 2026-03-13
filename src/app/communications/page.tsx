import { getEmails, getOutreachQueue } from "@/lib/communication-queries";
import { CommunicationsShell } from "@/components/communications/communications-shell";

export default async function CommunicationsPage() {
  const [emails, outreachItems] = await Promise.all([
    getEmails(),
    getOutreachQueue(),
  ]);

  return (
    <CommunicationsShell
      initialEmails={emails}
      outreachItems={outreachItems}
    />
  );
}
