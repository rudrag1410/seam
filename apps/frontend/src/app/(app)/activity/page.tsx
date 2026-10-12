import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/shell/PageHeader";
import { ActivityFeed } from "@/features/activity/ActivityFeed";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <PageBody>
      <PageHeader title="Activity" body="Everything you've uploaded, reviewed, exported and applied to." />
      <ActivityFeed />
    </PageBody>
  );
}
