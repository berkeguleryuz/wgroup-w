# Businessflix Tam Kapsamlı Proje Audit Tasarımı

## Amaç

Businessflix kod tabanını güvenlik, doğruluk, performans, Next.js ve React mimarisi, kimlik doğrulama, veri erişimi, erişilebilirlik, bağımlılıklar ve üretim hazırlığı açısından incelemek. Doğrulanmış kritik ve yüksek etkili sorunları, ayrıca davranışı bozmayan düşük riskli iyileştirmeleri doğrudan uygulamak. Mevcut unstaged kart geliştirmeleri korunacak ve bütün değişiklikler unstaged bırakılacak.

## Karar

Audit, yalnız rapor üreten bir inceleme veya geniş kapsamlı yeniden yazım olmayacak. Seçilen yaklaşım, kanıta dayalı hedefli iyileştirmedir:

1. Önce mevcut davranış ve sağlık durumu ölçülür.
2. Her bulgu kod, test, resmi dokümantasyon veya tarayıcı ölçümüyle doğrulanır.
3. Kritik, yüksek ve güvenli orta seviye bulgular düzeltilir.
4. Büyük mimari değişiklik veya major paket yükseltmesi ancak mevcut kodda somut bir sorunu çözüyor ve geçiş maliyeti ölçülebiliyorsa uygulanır.
5. Kalan düşük öncelikli veya ürün kararı gerektiren konular raporlanır.

## Kapsam

### React ve Next.js

- React Server Component ve Client Component sınırları
- Gereksiz istemci bundleı ve ağır bağımlılıkların yüklenmesi
- Bağımsız veri sorgularındaki waterfall davranışı
- `params`, `searchParams`, `cookies()` ve `headers()` gibi async API kullanımları
- Route Handler ve Server Action yetkilendirmesi
- Cache Components, `use cache`, request içi tekrar sorgular ve veri tazeliği
- `next/image`, font, script, metadata, loading ve error sınırları
- Hydration, global listener, timer ve cleanup davranışları

### Güvenlik ve kimlik doğrulama

- Better Auth secret, base URL, trusted origins, cookie ve rate limit ayarları
- Admin, editör, eğitmen ve organizasyon rol kontrolleri
- Server Action ve API endpointlerinde oturum, rol ve kaynak sahipliği doğrulaması
- CSRF ve origin kontrollerini zayıflatan ayarlar
- Upload, medya URL, redirect, log redaction ve hassas hata mesajları
- Cron, Stripe webhook, davet ve parola akışları

### Veri ve Supabase Postgres

- Prisma sorgularında gereksiz alan veya ilişki yükleme
- N+1 sorgu ve bağımsız sorguların seri çalışması
- Sık kullanılan filtreler, foreign keyler ve benzersizlik kuralları için indeksler
- RLS kapsamı, service role kullanımı ve uygulama seviyesi erişim kontrolü
- Transaction gerektiren çok adımlı yazma işlemleri
- Connection pool ve Prisma adapter yapılandırması

### İstemci deneyimi ve erişilebilirlik

- Klavye erişimi, focus görünürlüğü, accessible name ve tooltip ilişkileri
- Dialog, menü, form hata mesajı ve canlı bölge davranışları
- Mobil taşma, reduced motion ve tema kontrastı
- Büyük listelerde render maliyeti ve istemci state güncellemeleri

### Bağımlılıklar ve operasyon

- `npm audit`, güncel paket sürümleri ve peer dependency uyumu
- Mevcut major sürümlerde güvenli patch ve minor yükseltmeler
- Kullanılmayan veya yanlış katmanda kullanılan bağımlılıklar
- Build, lint, typecheck, test ve Prisma şema doğrulaması
- Vercel cron, ortam değişkenleri ve üretim yapılandırması

## Öncelik modeli

| Seviye | Tanım | Uygulama kararı |
|---|---|---|
| P0 | Veri sızıntısı, yetki atlama, ödeme veya içerik erişim ihlali | Hemen düzelt |
| P1 | Üretim hatası, önemli performans sorunu, kalıcı veri tutarsızlığı | Bu çalışma içinde düzelt |
| P2 | Ölçülebilir bakım, erişilebilirlik veya performans sorunu | Düşük riskliyse düzelt |
| P3 | Stil tercihi, varsayımsal optimizasyon, kapsamlı yeniden tasarım | Raporla |

## Değişiklik güvenliği

- Mevcut unstaged değişiklikler yeni audit düzeltmelerinden diff üzerinden ayrıştırılacak.
- Worktree, geçici clone, commit, staging, push ve PR kullanılmayacak.
- Davranış değişikliği veya bug fix için önce başarısız test üretilecek.
- Paket yükseltmeleri mevcut major sürüm içinde tutulacak. Major yükseltme ancak resmi geçiş rehberi ve mevcut test matrisiyle destekleniyorsa yapılacak.
- Veritabanına canlı migration uygulanmayacak. Gerekli şema değişikliği migration dosyası olarak hazırlanıp doğrulanacak.
- Harici servislerde yazma işlemi yapılmayacak.

## Doğrulama

Minimum son doğrulama matrisi:

- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit --json`
- `npx prisma validate`
- Güvenlik ve RLS denetim scriptlerinin güvenli, salt okunur modları
- Etkilenen kullanıcı akışları için tarayıcı kontrolü
- `git diff --check` ve unstaged dosya raporu

## Teslimatlar

- Bu tasarım belgesi
- Bulgulara bağlı ayrıntılı uygulama planı
- Uygulanan düzeltmeler ve testler
- `artifacts/full-project-audit/2026-07-15-report.md` audit raporu
- Kalan riskler, ertelenen major yükseltmeler ve doğrulama sonuçları

## Özdenetim

- Placeholder bulunmuyor.
- Kapsam, mevcut Next.js, Better Auth, Prisma, Supabase ve Vercel mimarisiyle uyumlu.
- Kullanıcının ön onayı nedeniyle ayrıca onay beklenmeyecek.
- Spec, yeniden tasarım yerine ölçülebilir audit ve hedefli düzeltmeye odaklanıyor.

