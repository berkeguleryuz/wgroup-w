import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

import { localizedPath, type Locale } from "@/lib/i18n/routing";
import { prisma } from "@/lib/prisma";
import { sendCorporateLeadNotification } from "@/lib/email";
import { consumeCorporateLeadRateLimit } from "@/lib/security/public-rate-limit";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "businessPage" });
  return { title: `${t("kicker")} · Busyflix` };
}

async function submitLead(formData: FormData) {
  "use server";
  const companyName = String(formData.get("companyName") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const seatTargetRaw = String(formData.get("seatTarget") || "").trim();
  const message = String(formData.get("message") || "").trim() || null;

  const locale = await getLocale();
  const fail = () => redirect(`${localizedPath(locale, "/business")}?err=1`);

  // Honeypot: real users never fill this hidden field; bots do. Pretend success.
  if (String(formData.get("website") || "").trim()) {
    redirect(`${localizedPath(locale, "/business")}?ok=1`);
  }

  const emailOk = /^\S+@\S+\.\S+$/.test(email);
  const phoneOk = !phone || /^[+0][0-9\s\-()]{6,19}$/.test(phone);
  if (
    !phoneOk ||
    !companyName ||
    companyName.length > 200 ||
    !contactName ||
    contactName.length > 200 ||
    !emailOk ||
    email.length > 200 ||
    (message && message.length > 2000)
  ) {
    fail();
  }
  const seatTarget = seatTargetRaw ? Number(seatTargetRaw) : null;
  if (
    seatTarget !== null &&
    (!Number.isSafeInteger(seatTarget) || seatTarget < 1)
  ) {
    fail();
  }

  if (process.env.NODE_ENV === "production") {
    const allowed = await consumeCorporateLeadRateLimit(await headers());
    if (!allowed) fail();
  }

  try {
    await prisma.corporateLead.create({
      data: { companyName, contactName, email, phone, seatTarget, message },
    });
    after(async () => {
      const sent = await sendCorporateLeadNotification({
        companyName,
        contactName,
        email,
        seatTarget,
        message,
      });
      if (!sent) {
        console.error("[corporate-lead] notification delivery failed");
      }
    });
  } catch {
    redirect(`${localizedPath(locale, "/business")}?err=1`);
  }
  redirect(`${localizedPath(locale, "/business")}?ok=1`);
}

export default async function BusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ ok?: string; err?: string }>;
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
            <Step title={t("step1Title")} body={t("step1Body")} />
            <Step title={t("step2Title")} body={t("step2Body")} />
            <Step title={t("step3Title")} body={t("step3Body")} />
            <Step title={t("step4Title")} body={t("step4Body")} />
          </div>
        </div>

        <form
          action={submitLead}
          className="rounded-11 border border-border bg-background p-8"
        >
          <h2 className="font-display text-2xl">{t("formTitle")}</h2>
          {/* Honeypot — hidden from humans, catches bots. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
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
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  pattern="[+0][0-9\s\-\(\)]{6,19}"
                  title={t("formPhoneHint")}
                  placeholder={t("formPhonePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="seatTarget">{t("formSeats")}</Label>
                <Input
                  id="seatTarget"
                  name="seatTarget"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="25"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="message">{t("formMessage")}</Label>
              <Textarea id="message" name="message" rows={4} />
            </div>

            <Button type="submit" variant="shine" size="lg">
              {t("formSubmit")}
            </Button>
          </div>
          {sp?.ok === "1" ? (
            <p className="mt-4 rounded-11 border border-border bg-primary/60 px-4 py-3 text-sm">
              {t("formSuccess")}
            </p>
          ) : null}
          {sp?.err === "1" ? (
            <p className="mt-4 rounded-11 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {t("formError")}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function Step({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <span aria-hidden className="text-xl leading-8 text-muted-foreground">
        ✦
      </span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
