import { DashboardAgentSection } from "@/components/agents/dashboard-agent-section";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="font-['Playfair_Display'] text-2xl font-bold text-[#F5F0E8]">
          {getGreeting()}, Armaan
        </h1>
        <p className="text-sm text-[#8B8FA3] mt-1">
          Your command center is ready.
        </p>
      </div>

      <DashboardAgentSection latestBriefing={null} />
    </div>
  );
}
