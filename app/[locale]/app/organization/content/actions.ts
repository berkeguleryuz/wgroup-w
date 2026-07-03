"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { updateTag } from "next/cache";
import { TitleType } from "@prisma/client";

import { localizedPath } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { requireOrgContentStudio } from "@/lib/corporate";
import { cleanupStorageRefs } from "@/lib/storage-cleanup";
import { slugify, isNextRedirect } from "@/lib/utils";

/** Resolve the caller's org and assert it owns the title. */
async function requireOwnedTitle(titleId: string) {
  const { membership } = await requireOrgContentStudio();
  const orgId = membership.organizationId;
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title || title.createdByOrgId !== orgId) {
    throw new Error("forbidden");
  }
  return { title, orgId };
}

async function backToContent(titleId?: string, toast?: string) {
  updateTag("featured-titles");
  const locale = await getLocale();
  const base = titleId
    ? `/app/organization/content/${titleId}`
    : "/app/organization/content";
  // `?toast=<key>` is picked up client-side by the Toaster and shown once.
  redirect(localizedPath(locale, toast ? `${base}?toast=${toast}` : base));
}

/** Keep only department ids that actually belong to the org. */
async function sanitizeDepartmentIds(orgId: string, raw: string[]) {
  if (raw.length === 0) return [];
  const departments = await prisma.department.findMany({
    where: { organizationId: orgId, id: { in: raw } },
    select: { id: true },
  });
  return departments.map((d) => d.id);
}

export async function createOrgTitle(formData: FormData) {
  const { membership } = await requireOrgContentStudio();
  const orgId = membership.organizationId;
  try {

  const title = String(formData.get("title") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim();
  const type = String(formData.get("type") || "SERIES") as TitleType;
  const categoryId = String(formData.get("categoryId") || "");
  if (!title || !synopsis || !categoryId) throw new Error("Missing fields");

  // No selection = the whole company (default).
  const departmentIds = await sanitizeDepartmentIds(
    orgId,
    formData.getAll("departmentIds").map(String),
  );

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 7)}`;
  const created = await prisma.title.create({
    data: {
      slug,
      title,
      synopsis,
      type,
      categoryId,
      published: false,
      // Self-serve titles are locked to the creating company: never public,
      // audience is exactly the owning org.
      visibility: "ORG_ONLY",
      createdByOrgId: orgId,
      orgAudience: { create: { organizationId: orgId } },
      departmentAudience: {
        create: departmentIds.map((departmentId) => ({ departmentId })),
      },
    },
  });
  await backToContent(created.id, "created");
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    await backToContent(undefined, "error");
  }
}

export async function setOrgTitleDepartments(formData: FormData) {
  const id = String(formData.get("id"));
  const { orgId } = await requireOwnedTitle(id);

  const departmentIds = await sanitizeDepartmentIds(
    orgId,
    formData.getAll("departmentIds").map(String),
  );

  // Replace the whole set: unchecked everything = back to whole-company.
  await prisma.$transaction([
    prisma.titleDepartment.deleteMany({ where: { titleId: id } }),
    prisma.titleDepartment.createMany({
      data: departmentIds.map((departmentId) => ({
        titleId: id,
        departmentId,
      })),
    }),
  ]);
  await backToContent(id, "saved");
}

export async function updateOrgTitle(formData: FormData) {
  const id = String(formData.get("id"));
  await requireOwnedTitle(id);

  const title = String(formData.get("title") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim();
  const heroImageUrl = String(formData.get("heroImageUrl") || "").trim() || null;
  if (!title || !synopsis) throw new Error("Missing fields");

  const before = await prisma.title.findUnique({
    where: { id },
    select: { heroImageUrl: true },
  });
  await prisma.title.update({
    where: { id },
    data: { title, synopsis, heroImageUrl },
  });
  // Drop the replaced cover from storage once nothing references it.
  if (before && before.heroImageUrl !== heroImageUrl) {
    await cleanupStorageRefs([before.heroImageUrl]);
  }
  await backToContent(id, "saved");
}

export async function toggleOrgPublish(formData: FormData) {
  const id = String(formData.get("id"));
  const { title } = await requireOwnedTitle(id);
  await prisma.title.update({
    where: { id },
    data: {
      published: !title.published,
      publishedAt: !title.published ? new Date() : title.publishedAt,
    },
  });
  await backToContent(id, "saved");
}

export async function deleteOrgTitle(formData: FormData) {
  const id = String(formData.get("id"));
  await requireOwnedTitle(id);
  const doomed = await prisma.title.findUnique({
    where: { id },
    include: {
      episodes: {
        select: { videoPath: true, subtitles: { select: { vttPath: true } } },
      },
    },
  });
  await prisma.title.delete({ where: { id } });
  if (doomed) {
    await cleanupStorageRefs([
      doomed.heroImageUrl,
      ...doomed.episodes.flatMap((e) => [
        e.videoPath,
        ...e.subtitles.map((sub) => sub.vttPath),
      ]),
    ]);
  }
  await backToContent(undefined, "deleted");
}

export async function addOrgEpisode(formData: FormData) {
  const titleId = String(formData.get("titleId"));
  await requireOwnedTitle(titleId);
  try {

  const name = String(formData.get("name") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim() || null;
  const seasonNumber = Number(formData.get("seasonNumber") || 1);
  const episodeNumber = Number(formData.get("episodeNumber") || 1);
  const durationSec = Number(formData.get("durationSec") || 0);
  const previewSec = Number(formData.get("previewSec") || 0);
  const videoPath = String(formData.get("videoPath") || "").trim();
  if (!name || !videoPath) throw new Error("Missing fields");

  await prisma.episode.create({
    data: {
      titleId,
      name,
      synopsis,
      seasonNumber,
      episodeNumber,
      durationSec,
      previewSec,
      videoPath,
    },
  });
  await backToContent(titleId, "created");
  } catch (e) {
    if (isNextRedirect(e)) throw e;
    await backToContent(titleId, "error");
  }
}

export async function updateOrgEpisode(formData: FormData) {
  const titleId = String(formData.get("titleId"));
  await requireOwnedTitle(titleId);

  const id = String(formData.get("id"));
  const episode = await prisma.episode.findUnique({ where: { id } });
  if (!episode || episode.titleId !== titleId) throw new Error("forbidden");

  const name = String(formData.get("name") || "").trim();
  const synopsis = String(formData.get("synopsis") || "").trim() || null;
  const seasonNumber = Number(formData.get("seasonNumber") || 1);
  const episodeNumber = Number(formData.get("episodeNumber") || 1);
  // Only present when a replacement video was selected (measured client-side
  // from the file's metadata); absent = keep the stored duration.
  const durationRaw = String(formData.get("durationSec") ?? "").trim();
  const previewSec = Number(formData.get("previewSec") || 0);
  // Empty = keep the current video; the upload field is optional on edit.
  const videoPath = String(formData.get("videoPath") || "").trim();
  if (!name) throw new Error("Missing fields");

  await prisma.episode.update({
    where: { id },
    data: {
      name,
      synopsis,
      seasonNumber,
      episodeNumber,
      previewSec,
      ...(durationRaw ? { durationSec: Number(durationRaw) } : {}),
      ...(videoPath ? { videoPath } : {}),
    },
  });
  // Drop the replaced video from storage once nothing references it.
  if (videoPath && episode.videoPath !== videoPath) {
    await cleanupStorageRefs([episode.videoPath]);
  }
  await backToContent(titleId, "saved");
}

export async function deleteOrgEpisode(formData: FormData) {
  const titleId = String(formData.get("titleId"));
  await requireOwnedTitle(titleId);

  const id = String(formData.get("id"));
  const episode = await prisma.episode.findUnique({ where: { id } });
  if (!episode || episode.titleId !== titleId) throw new Error("forbidden");

  await prisma.episode.delete({ where: { id } });
  await cleanupStorageRefs([episode.videoPath]);
  await backToContent(titleId, "deleted");
}

// ---------------------------------------------------------------------------
// Org-scoped instructors: companies manage their own instructor pool and can
// only credit those instructors on their own titles.
// ---------------------------------------------------------------------------

export async function createOrgInstructor(formData: FormData) {
  const { membership } = await requireOrgContentStudio();
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") || "").trim() || null;
  if (!name) throw new Error("Missing fields");

  await prisma.instructor.create({
    data: { name, bio, photoUrl, createdByOrgId: membership.organizationId },
  });
  await backToContent(undefined, "created");
}

export async function updateOrgInstructor(formData: FormData) {
  const { membership } = await requireOrgContentStudio();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") || "").trim() || null;
  if (!name) throw new Error("Missing fields");

  const { count } = await prisma.instructor.updateMany({
    where: { id, createdByOrgId: membership.organizationId },
    data: { name, bio, photoUrl },
  });
  if (count === 0) throw new Error("forbidden");
  await backToContent(undefined, "saved");
}

export async function deleteOrgInstructor(formData: FormData) {
  const { membership } = await requireOrgContentStudio();
  const id = String(formData.get("id"));
  const doomed = await prisma.instructor.findUnique({
    where: { id },
    select: { createdByOrgId: true, photoUrl: true },
  });
  if (!doomed || doomed.createdByOrgId !== membership.organizationId) {
    throw new Error("forbidden");
  }
  await prisma.instructor.delete({ where: { id } });
  await cleanupStorageRefs([doomed.photoUrl]);
  await backToContent(undefined, "deleted");
}

export async function addOrgCredit(formData: FormData) {
  const titleId = String(formData.get("titleId"));
  const { orgId } = await requireOwnedTitle(titleId);
  const instructorId = String(formData.get("instructorId") || "");
  const role = String(formData.get("role") || "").trim() || null;
  if (!instructorId) return;

  // Only the company's own instructors may be credited on its titles.
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: { createdByOrgId: true },
  });
  if (!instructor || instructor.createdByOrgId !== orgId) {
    throw new Error("forbidden");
  }
  await prisma.titleInstructor.upsert({
    where: { titleId_instructorId: { titleId, instructorId } },
    create: { titleId, instructorId, role },
    update: { role },
  });
  await backToContent(titleId, "saved");
}

export async function removeOrgCredit(formData: FormData) {
  const titleId = String(formData.get("titleId"));
  await requireOwnedTitle(titleId);
  const instructorId = String(formData.get("instructorId"));
  await prisma.titleInstructor.delete({
    where: { titleId_instructorId: { titleId, instructorId } },
  });
  await backToContent(titleId, "saved");
}
