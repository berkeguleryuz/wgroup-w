import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { sendCorporateLeadNotification } from "@/lib/email";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "businessPage" });
  return { title: `${t("kicker")} · Businessflix` };
}

async function submitLead(formData: FormData) {
  "use server";
  const companyName = String(formData.get("companyName") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const seatTargetRaw = String(formData.get("seatTarget") || "").trim();
  const message = String(formData.get("message") || "").trim() || null;

  if (!companyName || !contactName || !email) throw new Error("Missing fields");
  const seatTarget = seatTargetRaw ? Number(seatTargetRaw) : null;

  await prisma.corporateLead.create({
    data: { companyName, contactName, email, phone, seatTarget, message },
  });

  void sendCorporateLeadNotification({
    companyName,
    contactName,
    email,
    seatTarget,
    message,
  });
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ ok?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("businessPage");
  const sp = searchParams ? await searchParams : undefined;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <span className="font-accent text-xl text-muted-foreground">
            {t("kicker")}
          </span>
          <h1 className="mt-2 text-4xl md:text-6xl">{t("heading")}</h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            {t("description")}
          </p>

          <div id="how-it-works" className="mt-10 space-y-6">
            <Step n="01" title={t("step1Title")} body={t("step1Body")} />
            <Step n="02" title={t("step2Title")} body={t("step2Body")} />
            <Step n="03" title={t("step3Title")} body={t("step3Body")} />
            <Step n="04" title={t("step4Title")} body={t("step4Body")} />
          </div>
        </div>

        <form
          action={submitLead}
          className="rounded-11 border border-border bg-background p-8"
        >
          <h2 className="font-display text-2xl">{t("formTitle")}</h2>
          <div className="mt-6 grid gap-4">
            <div>
              <Label htmlFor="companyName">{t("formCompany")}</Label>
              <Input id="companyName" name="companyName" required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="contactName">{t("formContact")}</Label>
                <Input id="contactName" name="contactName" required />
              </div>
              <div>
                <Label htmlFor="email">{t("formEmail")}</Label>
                <Input id="email" type="email" name="email" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">{t("formPhone")}</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="seatTarget">{t("formSeats")}</Label>
                <Input
                  id="seatTarget"
                  name="seatTarget"
                  type="number"
                  min={1}
                  placeholder="25"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="message">{t("formMessage")}</Label>
              <Textarea id="message" name="message" rows={4} />
            </div>

            <Button type="submit" variant="dark" size="lg">
              {t("formSubmit")}
            </Button>
          </div>
          {sp?.ok === "1" ? (
            <p className="mt-4 rounded-11 border border-border bg-primary/60 px-4 py-3 text-sm">
              {t("formSuccess")}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span className="font-display text-3xl text-muted-foreground">{n}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
