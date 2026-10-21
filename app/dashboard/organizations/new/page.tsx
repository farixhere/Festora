import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/primitives";
import { CreateOrganizationForm } from "@/features/organizations/organization-form";

export const metadata: Metadata = { title: "New organization" };

export default function NewOrganizationPage() {
  return (
    <div className="max-w-xl">
      <PageHeader
        title="New organization"
        description="Keep events, teams and participant data for different groups completely separate."
      />
      <Card className="p-6">
        <CreateOrganizationForm />
      </Card>
    </div>
  );
}
