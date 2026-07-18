# Kart Tooltip Tasarımı

## Amaç

Yeni eklenen A ve B kart varyantlarındaki yalnızca ikonla gösterilen eylemleri daha anlaşılır hale getirmek. Tooltip, mevcut kart hover davranışının yerine geçmez ve kartın tamamına uygulanmaz.

## Kapsam

Tooltip şu kontrollerde kullanılacak:

- A varyantı genişleyen panelindeki Daha Fazla Bilgi bağlantısı
- A varyantı genişleyen panelindeki İzleme listesinden kaldır butonu
- B varyantındaki Daha Fazla Bilgi bağlantısı

Metin içeren Oynat butonuna ve kart yüzeyine tooltip eklenmeyecek.

## Görsel Tasarım

- Arka plan: proje `primary` rengi
- Metin: `primary-foreground`
- Radius: proje varsayılanı `rounded-11`
- Boyut: tek satırlık kısa etiket, kompakt yatay padding
- Konum: tetikleyicinin üstünde, ortalanmış
- Yön göstergesi: tooltip ile aynı renkte küçük üçgen ok
- Gölge: karttan ayrışmasını sağlayan ölçülü koyu gölge

Renkler, radius ve gölge için mevcut proje tokenları kullanılacak. Bileşen içinde yeni hex renk tanımlanmayacak.

## Etkileşim

- Pointer hover başladıktan 250 ms sonra açılır.
- Pointer ayrıldıktan yaklaşık 100 ms sonra kapanır.
- Klavye focus durumunda gecikmesiz açılır.
- Blur ve Escape ile kapanır.
- Scroll ve resize sırasında kapanır.
- Tooltip etkileşim almaz, `pointer-events: none` kullanır.
- `prefers-reduced-motion: reduce` durumunda hareket animasyonu kullanılmaz.

## Mimari

Yeni, tekrar kullanılabilir bir client bileşeni oluşturulacak:

`components/ui/Tooltip.tsx`

Bileşen şu sorumluluklara sahip olacak:

- Tetikleyici elementin ölçüsünü almak
- Açılma ve kapanma zamanlayıcılarını yönetmek
- Tooltip içeriğini `document.body` altında portal ile render etmek
- Tooltip konumunu viewport kenarlarında güvenli boşlukla sınırlamak
- Erişilebilir tooltip kimliğini üretmek
- Hover, focus, blur, Escape, scroll ve resize durumlarını yönetmek

Önerilen arayüz:

```tsx
<Tooltip label={moreInfoLabel}>
  <Link aria-label={`${moreInfoLabel}: ${title.title}`}>...</Link>
</Tooltip>
```

Yeni bağımlılık eklenmeyecek. Mevcut portal tabanlı kart paneliyle aynı konumlandırma yaklaşımı izlenecek, ancak tooltip bileşeni bağımsız kalacak.

## Erişilebilirlik

- Portal içeriği `role="tooltip"` kullanır.
- `useId()` ile kararlı bir tooltip kimliği oluşturulur.
- Tetikleyici mevcut `aria-label` değerini korur.
- Tetikleyici `aria-describedby` ile tooltip kimliğine bağlanır.
- Native `title` özellikleri kaldırılır, böylece iki tooltip üst üste görünmez.
- Klavye kullanıcıları tooltip'i focus ile görebilir.
- Tooltip tek başına erişilebilir ad yerine geçmez.

## Çeviriler

Yeni çeviri anahtarı eklenmeyecek. Mevcut değerler kullanılacak:

- `appHome.moreInfo`
- `appHome.removeFromList` üzerinden gelen `removeLabel`

## Hata ve Sınır Durumları

- Tetikleyici ölçülemezse tooltip açılmaz.
- Tooltip genişliği viewport genişliğini aşarsa güvenli yatay boşluk içinde sınırlandırılır.
- Üstte yeterli alan yoksa tetikleyicinin altında gösterilir.
- Tetikleyici unmount olduğunda zamanlayıcılar temizlenir.
- Aynı anda bir kart paneli ve onun içindeki tek tooltip görünür olabilir.

## Test Planı

Otomatik testler:

- Hover açılma gecikmesi
- Ayrılma sonrası kapanma gecikmesi
- Focus ile gecikmesiz açılma
- Escape ile kapanma
- Viewport yatay sınırlandırması
- Üstte alan olmadığında alt konuma geçiş
- Reduced-motion durumunda hareket sınıfının kaldırılması

Tarayıcı doğrulaması:

- A panelinde bilgi tooltip'i
- A panelinde kaldırma tooltip'i
- B kartında bilgi tooltip'i
- İlk ve son carousel kartlarında viewport sınırları
- Klavye focus akışı
- 390 px mobil genişlik
- Reduced-motion emülasyonu

## Başarı Ölçütleri

- Tooltip portal nedeniyle carousel veya kart tarafından kırpılmaz.
- A görsel seçeneğindeki krem marka görünümünü taşır.
- Native ve özel tooltip aynı anda görünmez.
- Mouse, klavye ve reduced-motion davranışları tutarlıdır.
- Mevcut kart hover paneli, oynatma bağlantıları ve kaldırma eylemi değişmeden çalışır.
