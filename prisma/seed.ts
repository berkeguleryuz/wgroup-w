import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Section, TitleType } from "@prisma/client";

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

const SAMPLE_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

type EpisodeSeed = {
  name: string;
  synopsis: string;
  durationSec: number;
};

type TitleSeed = {
  slug: string;
  title: string;
  synopsis: string;
  type: TitleType;
  categorySlug: string;
  heroImageUrl: string;
  instructors?: string[];
  episodes: EpisodeSeed[];
};

const CATEGORIES = [
  { slug: "diziler", title: "Diziler", section: Section.SERIES, sortOrder: 0, parent: null },
  { slug: "filmler", title: "Filmler", section: Section.MOVIE, sortOrder: 1, parent: null },
  { slug: "talent-management", title: "Talent Management", section: Section.TALENT, sortOrder: 2, parent: null },
  { slug: "liderlik", title: "Liderlik", section: Section.SERIES, parent: "diziler" },
  { slug: "girisimcilik", title: "Girişimcilik", section: Section.SERIES, parent: "diziler" },
  { slug: "pazarlama", title: "Pazarlama", section: Section.SERIES, parent: "diziler" },
  { slug: "belgesel", title: "Belgesel", section: Section.MOVIE, parent: "filmler" },
  { slug: "masterclass", title: "Masterclass", section: Section.MOVIE, parent: "filmler" },
  { slug: "kariyer-gelisim", title: "Kariyer Gelişim", section: Section.TALENT, parent: "talent-management" },
];

const INSTRUCTORS = [
  {
    id: "seed-mentor-a",
    name: "Berke Güleryüz",
    bio: "Ürün & girişim danışmanı. Erken aşama şirketlere mentörlük veriyor.",
  },
  {
    id: "seed-mentor-b",
    name: "Ayşe Demir",
    bio: "Global pazarlama liderliği deneyimi olan stratejist.",
  },
  {
    id: "seed-mentor-c",
    name: "Mert Kaya",
    bio: "Scale-up operasyon lideri, kurumsal dönüşüm danışmanı.",
  },
];

function eps(...rows: [string, string, number][]): EpisodeSeed[] {
  return rows.map(([name, synopsis, durationSec]) => ({ name, synopsis, durationSec }));
}

const TITLES: TitleSeed[] = [
  {
    slug: "lider-dogmaz-olusur",
    title: "Lider Doğmaz, Oluşur",
    synopsis:
      "Ekip kurmaktan kültür inşa etmeye; modern liderliğin temel pratiklerini bölüm bölüm derliyoruz.",
    type: TitleType.SERIES,
    categorySlug: "liderlik",
    heroImageUrl: img("1522071820081-009f0129c71c"),
    instructors: ["seed-mentor-a"],
    episodes: eps(
      ["Niyet ve Vizyon", "Takımına yön veren lider olmak.", 1320],
      ["Zor Kararlar", "Belirsizlikte karar verme ritüelleri.", 1410],
      ["Güven Kültürü", "Ekibi psikolojik güvende tutmak.", 1200],
      ["Büyüme", "Scale-up dönüşümleri.", 1500],
    ),
  },
  {
    slug: "sifirdan-girisim",
    title: "Sıfırdan Girişim",
    synopsis: "İlk 100 gününde ürün, ekip ve fon: pratik bir yol haritası.",
    type: TitleType.SERIES,
    categorySlug: "girisimcilik",
    heroImageUrl: img("1556761175-5973dc0f32e7"),
    instructors: ["seed-mentor-a"],
    episodes: eps(
      ["Problem-Market Fit", "Doğru problemi bulmak.", 1380],
      ["MVP Kurgusu", "Az yapıp çok öğrenmek.", 1260],
      ["İlk Ekip", "İlk 5 çalışan.", 1440],
    ),
  },
  {
    slug: "pazarlama-marka-sesi",
    title: "Pazarlamada Marka Sesi",
    synopsis: "B2B ve B2C markalar için tutarlı bir ses geliştirmek.",
    type: TitleType.SERIES,
    categorySlug: "pazarlama",
    heroImageUrl: img("1460925895917-afdab827c52f"),
    instructors: ["seed-mentor-b"],
    episodes: eps(
      ["Ses Haritası", "Markanın tonunu çıkarmak.", 1320],
      ["İçerik Ritmi", "Kanal bazlı yayın tempo.", 1260],
      ["Topluluk", "Müşteriyi topluluğa çevirmek.", 1380],
    ),
  },
  {
    slug: "uzaktan-ekip-yonetimi",
    title: "Uzaktan Ekip Yönetimi",
    synopsis: "Dağıtık ekiplerde ritim, iletişim ve hesap verebilirlik kurmak.",
    type: TitleType.SERIES,
    categorySlug: "liderlik",
    heroImageUrl: img("1600880292203-757bb62b4baf"),
    instructors: ["seed-mentor-c"],
    episodes: eps(
      ["Asenkron Çalışma", "Toplantısız ilerleme kültürü.", 1290],
      ["Net Beklentiler", "Çıktı odaklı yönetim.", 1350],
      ["Bağ Kurmak", "Mesafeyi kapatan ritüeller.", 1230],
    ),
  },
  {
    slug: "buyume-motoru",
    title: "Büyüme Motoru",
    synopsis: "Sürdürülebilir büyüme için kanal, metrik ve deney disiplini.",
    type: TitleType.SERIES,
    categorySlug: "girisimcilik",
    heroImageUrl: img("1551288049-bebda4e38f71"),
    instructors: ["seed-mentor-a", "seed-mentor-b"],
    episodes: eps(
      ["Kuzey Yıldızı Metriği", "Tek bir metriğe hizalanmak.", 1320],
      ["Deney Döngüsü", "Haftalık büyüme deneyleri.", 1410],
      ["Kanal Seçimi", "Doğru kanala odaklanmak.", 1260],
      ["Elde Tutma", "Retention'ı büyütmek.", 1380],
    ),
  },
  {
    slug: "yarinlari-tasarlamak",
    title: "Yarınları Tasarlamak",
    synopsis: "On kurucunun gözünden bir dönüşüm belgeseli.",
    type: TitleType.MOVIE,
    categorySlug: "belgesel",
    heroImageUrl: img("1531482615713-2afd69097998"),
    episodes: eps(["Yarınları Tasarlamak", "Tam belgesel.", 3600]),
  },
  {
    slug: "sunum-sanati",
    title: "Sunum Sanatı — Masterclass",
    synopsis: "Kurul önünde, yatırımcı karşısında, sahnede güçlü sunum.",
    type: TitleType.MOVIE,
    categorySlug: "masterclass",
    heroImageUrl: img("1475721027785-f74eccf877e2"),
    instructors: ["seed-mentor-b"],
    episodes: eps(["Sunum Sanatı", "Tam masterclass.", 4200]),
  },
  {
    slug: "muzakere-masasi",
    title: "Müzakere Masası",
    synopsis: "Yüksek bahisli görüşmelerde hazırlık, çerçeveleme ve kapanış.",
    type: TitleType.MOVIE,
    categorySlug: "masterclass",
    heroImageUrl: img("1551836022-d5d88e9218df"),
    instructors: ["seed-mentor-c"],
    episodes: eps(["Müzakere Masası", "Tam masterclass.", 3900]),
  },
  {
    slug: "kariyer-sicrayisi",
    title: "Kariyerde Sıçrayış",
    synopsis: "İç transferden role shift'e, net kariyer hamleleri.",
    type: TitleType.MOVIE,
    categorySlug: "kariyer-gelisim",
    heroImageUrl: img("1454165804606-c3d57bc86b40"),
    episodes: eps(["Kariyerde Sıçrayış", "Tam program.", 2400]),
  },
  {
    slug: "ilk-yoneticilik",
    title: "İlk Yöneticiliğin",
    synopsis: "Bireysel katkıcılıktan ekip yönetimine geçişin ilk 90 günü.",
    type: TitleType.MOVIE,
    categorySlug: "kariyer-gelisim",
    heroImageUrl: img("1542744173-8e7e53415bb0"),
    instructors: ["seed-mentor-a"],
    episodes: eps(["İlk Yöneticiliğin", "Tam program.", 2700]),
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const categoryId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { title: c.title, section: c.section },
      create: {
        slug: c.slug,
        title: c.title,
        section: c.section,
        sortOrder: c.sortOrder ?? 0,
        parentId: c.parent ? categoryId.get(c.parent) : null,
      },
    });
    categoryId.set(c.slug, row.id);
  }

  for (const instr of INSTRUCTORS) {
    await prisma.instructor.upsert({
      where: { id: instr.id },
      update: { name: instr.name, bio: instr.bio },
      create: instr,
    });
  }

  let publishedAt = Date.now();
  let videoCursor = 0;
  for (const seed of TITLES) {
    const catId = categoryId.get(seed.categorySlug);
    if (!catId) throw new Error(`Unknown category: ${seed.categorySlug}`);

    publishedAt -= 86_400_000;
    const trailerUrl = SAMPLE_VIDEOS[videoCursor % SAMPLE_VIDEOS.length];
    const t = await prisma.title.upsert({
      where: { slug: seed.slug },
      update: {
        heroImageUrl: seed.heroImageUrl,
        synopsis: seed.synopsis,
        trailerUrl,
      },
      create: {
        slug: seed.slug,
        type: seed.type,
        title: seed.title,
        synopsis: seed.synopsis,
        heroImageUrl: seed.heroImageUrl,
        trailerUrl,
        categoryId: catId,
        published: true,
        publishedAt: new Date(publishedAt),
      },
    });

    await Promise.all(
      seed.episodes.map((ep, idx) => {
        const videoPath = SAMPLE_VIDEOS[videoCursor++ % SAMPLE_VIDEOS.length];
        return prisma.episode.upsert({
          where: {
            titleId_seasonNumber_episodeNumber: {
              titleId: t.id,
              seasonNumber: 1,
              episodeNumber: idx + 1,
            },
          },
          update: {
            name: ep.name,
            synopsis: ep.synopsis,
            videoPath,
            durationSec: ep.durationSec,
          },
          create: {
            titleId: t.id,
            seasonNumber: 1,
            episodeNumber: idx + 1,
            name: ep.name,
            synopsis: ep.synopsis,
            videoPath,
            durationSec: ep.durationSec,
            previewSec: 60,
            sortOrder: idx,
          },
        });
      }),
    );

    for (const instrId of seed.instructors ?? []) {
      await prisma.titleInstructor.upsert({
        where: { titleId_instructorId: { titleId: t.id, instructorId: instrId } },
        update: {},
        create: { titleId: t.id, instructorId: instrId, role: "Sunucu" },
      });
    }
  }

  console.log(`Seed completed — ${TITLES.length} titles, ${CATEGORIES.length} categories`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
