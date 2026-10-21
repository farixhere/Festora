import type { Metadata } from "next";
import { AccountIdRow, ChangePasswordForm, DeleteAccountSection, ProfileForm, SignOutOthersButton } from "@/components/dashboard/account-forms";
import { DeleteOrganizationButton } from "@/components/dashboard/delete-org";
import { ThemeChoice } from "@/components/layout/providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, PageHeader } from "@/components/ui/primitives";
import { listMembers } from "@/features/organizations/queries";
import { MembersManager } from "@/features/organizations/members-manager";
import { EditOrganizationForm } from "@/features/organizations/organization-form";
import { requireOrgContext } from "@/lib/auth/session";
import { assignableRoles, can, canModifyMember } from "@/lib/permissions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, org, role } = await requireOrgContext("/dashboard/settings");
  const members = await listMembers(org.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your account and the organization you're working in." />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent><ProfileForm name={user.name} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent><ThemeChoice /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password &amp; sessions</CardTitle>
          <CardDescription>Changing your password signs out your other devices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ChangePasswordForm />
          <SignOutOthersButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{org.name}</CardTitle>
          <CardDescription>Organization details · your role: {role}</CardDescription>
        </CardHeader>
        <CardContent>
          <EditOrganizationForm
            orgId={org.id}
            canEdit={can(role, "org.update")}
            defaults={{ name: org.name, description: org.description, website: org.website }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>{members.length} {members.length === 1 ? "member" : "members"}</CardDescription>
        </CardHeader>
        <CardContent>
          <MembersManager
            orgId={org.id}
            canManage={can(role, "members.manage")}
            assignable={assignableRoles(role)}
            members={members.map((m) => ({
              userId: m.userId,
              name: m.name,
              email: m.email,
              role: m.role,
              isYou: m.userId === user.id,
              canModify: m.userId !== user.id && canModifyMember(role, m.role),
            }))}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader><CardTitle>Danger zone</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {can(role, "org.delete") && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Delete {org.name} and everything in it.</p>
              <DeleteOrganizationButton orgId={org.id} name={org.name} />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Account ID (needed for platform-admin setup):</p>
            <AccountIdRow id={user.id} />
          </div>
          <DeleteAccountSection />
        </CardContent>
      </Card>
    </div>
  );
}
