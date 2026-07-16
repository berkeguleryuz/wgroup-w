# Businessflix Yerinde Güvenli İyileştirme Tasarımı

## Amaç

Businessflix uygulamasındaki güvenlik, veri bütünlüğü, bağımlılık, erişilebilirlik, lint ve test eksiklerini mevcut PostgreSQL verilerini ve R2 nesnelerini sıfırlamadan gidermek.

Başarı ölçütleri:

- Mevcut kullanıcılar, mock kullanıcılar, içerikler, abonelikler ve R2 referansları korunur.
- Kritik ve yüksek önem dereceli doğrudan bağımlılık açıkları kapanır.
- Sunucu tarafı medya istekleri SSRF saldırılarına kapatılır.
- Upload ve Talent Lab maliyet kötüye kullanımı sınırlandırılır.
- Auth e-posta tokenları loglanmaz ve gönderimler tamamlanmadan callback dönmez.
- Prisma migration geçmişi mevcut veritabanını sıfırlamadan oluşturulur.
- Test, lint, typecheck, build ve production dependency audit doğrulamaları çalışır.

## Kapsam

### 1. Bağımlılık güvenliği

- Better Auth güvenli kararlı sürüme yükseltilecek.
- Next.js ve `eslint-config-next` aynı güvenli patch sürümüne yükseltilecek.
- `next-intl`, Resend ve düzeltmesi bulunan transitif üretim bağımlılıkları güncellenecek.
- Better Auth plugin importları paketlerin doğrudan yollarından yapılacak.
- Güncellemelerden sonra auth şema uyumluluğu, typecheck, build ve audit doğrulanacak.

### 2. SSRF koruması

Medya URL politikası tek bir server-only modülde merkezileştirilecek.

Politika:

- Veritabanına episode video yolu olarak yalnızca yönetilen storage keyleri, site içi mutlak yollar ve açıkça izin verilen HTTPS medya originleri kaydedilebilir.
- `localhost`, loopback, link-local, private IPv4, private IPv6 ve kimlik bilgisi içeren URL'ler reddedilir.
- Sunucu tarafı fetch öncesinde URL tekrar doğrulanır.
- Redirectler otomatik takip edilmez. Redirect gerekiyorsa her hedef aynı politikadan geçirilir ve düşük bir redirect limiti uygulanır.
- R2 public base URL, Supabase storage hostu ve proje tarafından kullanılan açık medya hostları ortam/config üzerinden allowlist'e alınır.
- Preview ve subtitle proxyleri timeout, maksimum yanıt boyutu ve güvenli hata cevabı kullanır.

Bu yaklaşım yalnızca form doğrulamasına güvenmez. Kayıt katmanı ve fetch sınırında savunma uygulanır.

### 3. Upload güvenliği ve maliyet sınırları

- Video, görsel, avatar ve HLS upload istekleri Zod ile doğrulanır.
- Video MIME ve uzantı allowlist'i uygulanır.
- Görsellerde MIME ve uzantı birbiriyle uyumlu olmalıdır.
- İmzalı PUT isteklerinde desteklendiği ölçüde content-length sınırı imzaya dahil edilir.
- Storage sağlayıcısının boyutu imzada zorlayamadığı durumda upload sonrası kullanım ve kayıt sınırları korunur, istemci tarafından beyan edilen boyut tek başına güvenilir sayılmaz.
- Avatar, görsel, video ve HLS için ayrı maksimum boyut ve dosya sayısı sabitleri tanımlanır.
- Signed URL geçerliliği bir saatten kısa, kullanım için yeterli bir süreye indirilir.
- HLS batch signing sayısı ve toplam beyan edilen byte sınırı uygulanır.
- Hata cevapları dahili storage mesajlarını kullanıcıya doğrudan sızdırmaz.

### 4. Auth ve e-posta güvenliği

- Verification, password reset ve corporate welcome gönderimleri callback içinde `await` edilir.
- Gönderim başarısızlığı kontrollü biçimde ele alınır ve token URL'si loglanmaz.
- E-posta hata loglarında yalnızca olay türü, sağlayıcı hata kodu ve maskelenmiş alıcı bulunur.
- HTML gövdesi, reset URL'si ve verification URL'si hiçbir ortamda loglanmaz.
- Development no-op davranışı tokenı stdout'a yazmadan sürdürülür.

### 5. Talent Lab koruması

- Mesaj başına karakter sınırı eklenir.
- Model çıktı token limiti ürün kullanımına uygun bir seviyeye indirilir.
- Rate limit atomik veritabanı işlemiyle uygulanır. Paralel isteklerin say-ardından-yaz yarışını aşmasına izin verilmez.
- Kullanıcı başına aktif stream sayısı sınırlandırılır.
- Anthropic çağrısına timeout ve abort desteği eklenir.
- Başarısız model çağrılarında kullanıcı mesajı ve conversation durumu tutarlı kalır.
- Bu değişiklik için gerekli Prisma modeli ve indeks migration'a dahil edilir.

### 6. Migration ve mevcut veri koruması

Uygulama mevcut veritabanını resetlemeyecek.

Akış:

1. Salt okunur kontrollerle mevcut tablo, migration ve kritik kayıt sayıları incelenir.
2. Veritabanının şemayla uyumlu olduğu doğrulanır.
3. Mevcut Prisma şemasından bir başlangıç migration dosyası üretilir.
4. Başlangıç migration çalışan veritabanında baseline olarak işaretlenir, SQL tekrar uygulanmaz.
5. RLS, seat-limit trigger, eksik tablolar ve yeni rate-limit yapıları ayrı ileri migration ile eklenir.
6. Migration öncesi ve sonrası kullanıcı, organization, title, episode ve storage referansı sayıları karşılaştırılır.

Eğer gerçek şema Prisma modeliyle uyuşmazsa migration uygulanmaz. Önce yalnızca drift raporu hazırlanır ve veri koruyan ileri SQL oluşturulur. `prisma migrate reset`, `db push --force-reset`, tablo drop veya veri silme kullanılmaz.

R2 nesneleri taşınmaz veya silinmez. Veritabanındaki medya referansları korunur.

### 7. UI, lint ve erişilebilirlik

- MobileMenu portal mount yaklaşımı lint uyumlu hale getirilir.
- Menü açıldığında focus içeri alınır, Tab döngüsü menüde tutulur, Escape ile kapanır ve focus tetikleyiciye döner.
- Şifre görünürlük düğmeleri klavyeyle erişilebilir yapılır.
- İçerik görsellerinde mümkün olan yerlerde `next/image`, doğru `sizes` ve LCP önceliği kullanılır.
- Kullanılmayan prop ve eslint-disable satırları kaldırılır.
- Proje tema kurallarına aykırı bileşen renkleri `globals.css` tokenlarına veya merkezi semantik görsel tokenlara taşınır.
- Bayrak ve marka SVG renkleri içerik varlığı oldukları için tema token zorunluluğunun dışında tutulur.
- Global error sayfası root CSS yüklenemediğinde de çalışması gerektiği için gerekli inline fallback renklerini koruyabilir.

### 8. Test mimarisi

Yeni ağır bir test framework'ü eklemek yerine Node test runner ve `tsx --test` kullanılacak.

Test kapsamı:

- Medya URL allowlist'i ve private IP engelleri
- Redirect hedef doğrulaması
- Upload MIME, uzantı ve boyut politikaları
- E-posta log redaksiyonu yardımcıları
- Talent Lab payload ve rate-limit davranışı
- İçerik görünürlüğünün kritik saf fonksiyonları
- Subscription ve organization erişim yardımcıları

Route handler entegrasyonunda dış servisler gerçek ağa çıkmadan sınır bağımlılıkları enjekte edilebilir küçük yardımcılarla test edilecek. Her davranış değişikliği önce başarısız test ile gösterilecek, sonra minimum düzeltme uygulanacak.

## Uygulama sırası

1. Test altyapısı ve saf güvenlik politikası testleri
2. SSRF ve upload doğrulaması
3. Auth e-posta güvenliği
4. Talent Lab limitleri ve migration şema değişiklikleri
5. Bağımlılık güncellemeleri
6. Lint, erişilebilirlik, image ve tema düzeltmeleri
7. Baseline ve ileri migration hazırlığı
8. Tüm doğrulama paketi ve veri koruma karşılaştırması

Bağımlılık güncellemeleri güvenlik açısından acil olsa da önce davranış testlerinin kurulması, yükseltme sonrası regresyonları görünür kılar.

## Hata yönetimi

- Güvenlik doğrulama hataları 400 veya 403 ile genel mesaj döndürür.
- Upstream timeout ve medya origin hataları 502 veya 504 olarak ayrılır.
- Dahili hata metinleri istemciye taşınmaz.
- E-posta gönderim hataları token içermeyen yapılandırılmış log üretir.
- Migration drift veya veri sayısı farkı otomatik devam etmez, işlemi durdurur.

## Doğrulama kapıları

- Her TDD döngüsünde hedef test önce beklenen nedenle başarısız, sonra başarılı olmalıdır.
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit --omit=dev`
- `prisma validate`
- `prisma migrate status`
- Migration öncesi ve sonrası kritik kayıt sayıları
- `git diff --check`
- Kaynak değişiklikleri unstaged bırakılır, commit veya push yapılmaz.

## Kapsam dışı

- R2 nesnelerini yeniden kodlama veya taşıma
- Yeni ürün özelliği geliştirme
- Tasarımın görsel olarak yeniden yapılması
- Git commit, push veya pull request işlemleri
- Mevcut kullanıcı veya içerik verilerini silme
