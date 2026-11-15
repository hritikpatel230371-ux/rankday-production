import { PageHeader } from "@/components/page-header";
import { DailyLogClient } from "@/components/daily-log-client";

export default function DailyLogPage() {
  return (
    <>
      <PageHeader title="Daily Log" description="Write naturally. Confirm only the facts you want to save and rank." />
      <DailyLogClient />
    </>
  );
}
