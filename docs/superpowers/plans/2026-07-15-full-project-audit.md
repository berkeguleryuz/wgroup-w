# Businessflix Tam Kapsamli Audit Uygulama Plani

> Uygulama, mevcut unstaged kart ve tooltip degisiklikleri korunarak gercek proje dizininde yapilacak. Git yazma islemi yapilmayacak.

## Hedef

Uretim ortamlarinda auth URL sapmasini gidermek, veritabani RLS denetimini tum Prisma modellerini kapsayacak hale getirmek, public lead bildiriminin serverless calisma omrune bagli kaybolmasini onlemek, sunucu sirlarini belirginlestirmek, transcode CI kurulumunu tekrarlanabilir yapmak ve uyumlu bagimlilik guncellemelerini dogrulamak.

## Task 1: Ortam URL kaynagini tekillestir

**Dosyalar:**

- Olustur: `lib/app-url.ts`
- Olustur: `tests/security/app-url.test.ts`
- Degistir: `lib/auth.ts`
- Degistir: `lib/auth-client.ts`
- Degistir: `lib/email.ts`
- Degistir: `app/sitemap.ts`
- Degistir: `app/robots.ts`
- Degistir: `app/[locale]/layout.tsx`
- Degistir: `app/[locale]/app/admin/companies/actions.ts`
- Degistir: `app/[locale]/app/account/subscription/actions.ts`
- Degistir: `app/[locale]/app/organization/billing/actions.ts`
- Degistir: `app/[locale]/app/organization/members/actions.ts`

1. `BETTER_AUTH_URL` degerinin auth sunucusunda oncelikli oldugunu, public URL icin `NEXT_PUBLIC_APP_URL` degerinin oncelikli oldugunu ve sondaki slash karakterlerinin normalize edildigini test et.
2. Testi calistir ve mevcut kodda beklenen kirmizi sonucu gor.
3. Saf URL cozumleyicilerini ekle, auth istemcisinde ayni origin varsayimini kullanarak sabit `baseURL` degerini kaldir.
4. Dagitik URL sabitlerini merkezi cozumleyiciye tasi.
5. Hedef testi ve typecheck calistir.

## Task 2: Sunucu modulu sinirlarini guclendir

**Dosyalar:**

- Degistir: `lib/auth.ts`
- Degistir: `lib/prisma.ts`
- Degistir: `lib/email.ts`
- Degistir: `lib/stripe.ts`
- Degistir: `lib/supabase-storage.ts`
- Degistir: `lib/storage.ts`
- Olustur: `tests/security/server-boundaries.test.ts`

1. Gizli anahtar veya yetkili veritabani istemcisi kullanan cekirdek modullerin `server-only` ile isaretlendigini test et.
2. Testi calistir ve beklenen kirmizi sonucu gor.
3. Modullere `server-only` isaretini ekle.
4. Client tarafindaki type-only auth aktariminin derlemede sunucu modulunu bundle etmedigini typecheck ve build ile dogrula.

## Task 3: RLS denetimini tum semaya yay

**Dosyalar:**

- Degistir: `scripts/db-rls-audit.mjs`
- Olustur: `tests/security/rls-coverage.test.ts`

1. Prisma model tablo adlari ile `prisma/rls.sql` icindeki RLS tablolari arasinda bire bir kapsama testi yaz.
2. Audit scriptinin sabit dort tablo listesi yerine `prisma/rls.sql` kaynagindan tablo listesi cikardigini test et.
3. Beklenen kirmizi script testi gor.
4. Scripti RLS manifestini okuyacak ve bos manifesti reddedecek sekilde guncelle.
5. Testleri ve gercek veritabaninda read-only RLS auditini calistir.

## Task 4: Public lead bildirimini guvenilir hale getir

**Dosyalar:**

- Degistir: `app/[locale]/(marketing)/business/page.tsx`
- Olustur: `tests/security/corporate-lead-action.test.ts`

1. Bildirimin sahipsiz `void` promise yerine Next.js `after()` omru icinde calistirildigini ve hatanin kayda alindigini test et.
2. Beklenen kirmizi sonucu gor.
3. Veritabani yazimi basarili olduktan sonra email bildirimini `after()` ile planla.
4. Koltuk hedefinin pozitif ve guvenli tam sayi olmasini dogrula.
5. Hedef testi, lint ve typecheck calistir.

## Task 4b: Son organizasyon sahibini eszamanli islemlerde koru

**Dosyalar:**

- Degistir: `lib/corporate.ts`
- Degistir: `app/[locale]/app/organization/members/actions.ts`
- Olustur: `tests/security/org-owner-integrity.test.ts`

1. Sahip rol dusurme ve uye silme islemlerinin ayni organizasyon kapsamli transaction kilidini kullandigini test et.
2. Beklenen kirmizi sonucu gor.
3. PostgreSQL transaction advisory lock yardimcisini ekle.
4. Son sahip kontrolu ile mutasyonu ayni kilitli transaction icinde calistir.
5. Hedef test ve typecheck calistir.

## Task 5: Transcode CI kurulumunu tekrarlanabilir yap

**Dosyalar:**

- Degistir: `.gitignore`
- Degistir: `.github/workflows/transcode.yml`
- Olustur veya guncelle: `worker/package-lock.json`
- Olustur: `tests/ops/transcode-workflow.test.ts`

1. Worker lock dosyasinin ignore edilmedigini ve workflow'un `npm ci` kullandigini test et.
2. Beklenen kirmizi sonucu gor.
3. Ignore kuralini kaldir, lock dosyasini guncelle ve workflow'u `npm ci --no-audit --no-fund` yap.
4. Temiz lock uyumunu `npm ci --ignore-scripts` ile dogrula.

## Task 6: Dusuk riskli bagimlilik bakimi

**Dosyalar:**

- Degistir: `package.json`
- Degistir: `package-lock.json`
- Degistir: `worker/package.json`
- Degistir: `worker/package-lock.json`

1. Mevcut major sinirlarinda patch ve minor guncellemeleri uygula.
2. Next.js, Better Auth ve Prisma zaten guncelse major degisim yapma.
3. Swiper 14, ESLint 10, TypeScript 7 ve diger major gecisleri somut gereksinim olmadigi icin ertele.
4. Root ve worker `npm audit` sonucunu yeniden al.

## Task 7: Son dogrulama ve audit raporu

**Dosyalar:**

- Olustur: `docs/superpowers/audits/2026-07-15-full-project-audit.md`

1. `npm test` calistir.
2. `npm run lint` calistir.
3. `npm run typecheck` calistir.
4. `npm run build` calistir.
5. `npx prisma validate` ve read-only RLS auditini calistir.
6. Root ile worker icin `npm audit` calistir.
7. P0 ile P3 bulgularini, giderilenleri, ertelenen riskleri ve operasyon onerilerini raporla.
8. Son `git status --short` ve `git diff --stat` ile tum degisikliklerin unstaged kaldigini dogrula.
