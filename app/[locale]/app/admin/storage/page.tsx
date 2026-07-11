import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { requireRole } from "@/lib/access";
import { getStorage, isR2Configured } from "@/lib/storage";
import { getStorageInventory } from "./inventory";
import { deleteStorageObject, deleteAllOrphans } from "./actions";
import { ConfirmButton } from "@/components/editor/ConfirmButton";
import StatCard from "@/components/dashboard/StatCard";

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default async function AdminStoragePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireRole(["admin"]);
  const t = await getTranslations("admin");

  const configured = isR2Configured();
  const inventory = configured ? await getStorageInventory() : [];
  const orphans = inventory.filter((o) => !o.referenced);
  const totalSize = inventory.reduce((sum, o) => sum + o.size, 0);
  const orphanSize = orphans.reduce((sum, o) => sum + o.size, 0);
  const dateLocale =
    (await getLocale()) === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-US";

  return (
    <div className="space-y-8">
      <header>
        <span className="font-accent text-lg text-muted-foreground">
          {t("kicker")}
        </span>
        <h1 className="mt-1 text-3xl md:text-5xl">{t("storageHeading")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          {t("storageBody")}
        </p>
      </header>

      {!configured ? (
        <p className="rounded-11 border border-border/60 bg-background px-4 py-6 text-sm text-muted-foreground">
          {t("storageNoR2")}
        </p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={t("storageTotal")}
              value={inventory.length}
              sub={formatBytes(totalSize)}
              icon="database"
            />
            <StatCard
              label={t("storageInUse")}
              value={inventory.length - orphans.length}
              sub={formatBytes(totalSize - orphanSize)}
              icon="check"
              floatDelay={0.5}
            />
            <StatCard
              label={t("storageOrphans")}
              value={orphans.length}
              sub={formatBytes(orphanSize)}
              icon="trash"
              alert={orphans.length > 0}
              floatDelay={1}
            />
          </section>

          {orphans.length > 0 ? (
            <form action={deleteAllOrphans}>
              <ConfirmButton
                confirmTitle={t("storageCleanupTitle")}
                confirmText={t("storageCleanupConfirm", {
                  count: orphans.length,
                  size: formatBytes(orphanSize),
                })}
                confirmLabel={t("storageCleanup")}
                className="rounded-11 bg-surface-dark px-5 py-2.5 text-sm font-medium text-surface-dark-foreground transition-colors hover:bg-surface-dark/90"
              >
                {t("storageCleanup")} ({orphans.length})
              </ConfirmButton>
            </form>
          ) : null}

          <section className="rounded-11 border border-border/60 bg-background">
            <table className="w-full text-sm">
              <thead className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("storageColKey")}</th>
                  <th className="px-4 py-3">{t("storageColSize")}</th>
                  <th className="px-4 py-3">{t("storageColDate")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {inventory.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      {t("storageEmpty")}
                    </td>
                  </tr>
                ) : (
                  inventory.map((obj) => (
                    <tr key={obj.key}>
                      <td className="max-w-[320px] truncate px-4 py-3 font-mono text-xs">
                        {/* Opens the object straight from R2 so an orphan can
                            be eyeballed before deleting it. */}
                        <a
                          href={getStorage().getPublicUrl(
                            // Trees open via their master playlist.
                            obj.key.endsWith("/") ? `${obj.key}master.m3u8` : obj.key,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-4 hover:text-foreground hover:underline"
                        >
                          {obj.key}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatBytes(obj.size)}
                        {obj.fileCount ? (
                          <span className="ml-1 text-xs opacity-70">
                            · {obj.fileCount}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {obj.lastModified
                          ? obj.lastModified.toLocaleDateString(dateLocale)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-11 px-2 py-1 text-xs font-medium ${
                            obj.referenced
                              ? "bg-primary/40 text-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {obj.referenced
                            ? t("storageInUseBadge")
                            : t("storageOrphanBadge")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!obj.referenced ? (
                          <form action={deleteStorageObject}>
                            <input type="hidden" name="key" value={obj.key} />
                            <ConfirmButton
                              confirmText={t("storageDeleteConfirm", {
                                key: obj.key,
                              })}
                              confirmLabel={t("storageDelete")}
                              className="text-xs text-red-600 underline-offset-4 hover:underline"
                            >
                              {t("storageDelete")}
                            </ConfirmButton>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
