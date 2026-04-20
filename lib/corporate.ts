import { redirect } from "next/navigation";
import { requireSession } from "./access";
import { prisma } from "./prisma";

export async function requireOrgOwner() {
  const session = await requireSession();
  const userId = session.user.id;
  const ownerMembership = await prisma.member.findFirst({
    where: { userId, role: "owner" },
    include: { organization: { include: { companyProfile: true } } },
  });
  if (!ownerMembership) redirect("/app");
  return { session, membership: ownerMembership };
}
