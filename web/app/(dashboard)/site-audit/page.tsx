import { Globe } from "lucide-react";
import { getSiteAuditReport } from "@/lib/data";
import { EmptyState } from "@/components/ui";
import SiteAuditView from "@/components/SiteAuditView";

export default function SiteAuditPage() {
  const audit = getSiteAuditReport();

  if (!audit) {
    return (
      <div className="p-10">
        <EmptyState
          icon={<Globe className="w-5 h-5" />}
          title="Audit in progress"
          hint="The risalabs.ai GEO audit is running. Refresh once it completes to see the full report."
          command="Check back shortly — audit crawls up to 20 pages"
        />
      </div>
    );
  }

  return <SiteAuditView audit={audit} />;
}
