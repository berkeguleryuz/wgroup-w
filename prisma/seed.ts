import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Section, TitleType } from "@prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL missing");
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const diziler = await prisma.category.upsert({
    where: { slug: "diziler" },
    create: { slug: "diziler", title: "Diziler", section: Section.SERIES, sortOrder: 0 },
    update: {},
  });
  const filmler = await prisma.category.upsert({
    where: { slug: "filmler" },
    create: { slug: "filmler", title: "Filmler", section: Section.MOVIE, sortOrder: 1 },
    update: {},
  });
  const talent = await prisma.category.upsert({
    where: { slug: "talent-management" },
    create: {
      slug: "talent-management",
      title: "Talent Management",
      section: Section.TALENT,
      sortOrder: 2,
    },
    update: {},
  });

  async function genre(slug: string, title: string, parentId: string, section: Section) {
    return prisma.category.upsert({
      where: { slug },
      create: { slug, title, parentId, section },
      update: {},
    });
  }

  const liderlik = await genre("liderlik", "Liderlik", diziler.id, Section.SERIES);
  const girisimcilik = await genre("girisimcilik", "Girişimcilik", diziler.id, Section.SERIES);
  const pazarlama = await genre("pazarlama", "Pazarlama", diziler.id, Section.SERIES);

  const belgesel = await genre("belgesel", "Belgesel", filmler.id, Section.MOVIE);
  const masterclass = await genre("masterclass", "Masterclass", filmler.id, Section.MOVIE);

  const kariyerGelisim = await genre(
    "kariyer-gelisim",
    "Kariyer Gelişim",
    talent.id,
    Section.TALENT,
  );

  const mentorA = await prisma.instructor.upsert({
    where: { id: "seed-mentor-a" },
    create: {
      id: "seed-mentor-a",
      name: "Berke Güleryüz",
      bio: "Ürün & girişim danışmanı. Erken aşama şirketlere mentörlük veriyor.",
    },
    update: {},
  });
  const mentorB = await prisma.instructor.upsert({
    where: { id: "seed-mentor-b" },
    create: {
      id: "seed-mentor-b",
      name: "Ayşe Demir",
      bio: "Global pazarlama liderliği deneyimi olan stratejist.",
    },
    update: {},
  });

  async function series(args: {
    slug: string;
    title: string;
    synopsis: string;
    categoryId: string;
    episodes: { name: string; synopsis: string; durationSec: number; previewSec: number }[];
    instructors?: string[];
  }) {
    const t = await prisma.title.upsert({
      where: { slug: args.slug },
      update: {},
      create: {
        slug: args.slug,
        type: TitleType.SERIES,
        title: args.title,
        synopsis: args.synopsis,
        categoryId: args.categoryId,
        published: true,
        publishedAt: new Date(),
      },
    });
    await Promise.all(
      args.episodes.map((ep, idx) =>
        prisma.episode.upsert({
          where: {
            titleId_seasonNumber_episodeNumber: {
              titleId: t.id,
              seasonNumber: 1,
              episodeNumber: idx + 1,
            },
          },
          update: {},
          create: {
            titleId: t.id,
            seasonNumber: 1,
            episodeNumber: idx + 1,
            name: ep.name,
            synopsis: ep.synopsis,
            videoPath: `${args.slug}/s1-e${idx + 1}.mp4`,
            durationSec: ep.durationSec,
            previewSec: ep.previewSec,
            sortOrder: idx,
          },
        }),
      ),
    );
    for (const instrId of args.instructors ?? []) {
      await prisma.titleInstructor.upsert({
        where: { titleId_instructorId: { titleId: t.id, instructorId: instrId } },
        update: {},
        create: { titleId: t.id, instructorId: instrId, role: "Sunucu" },
      });
    }
    return t;
  }

  async function movie(args: {
    slug: string;
    title: string;
    synopsis: string;
    categoryId: string;
    durationSec: number;
    previewSec: number;
    instructors?: string[];
  }) {
    const t = await prisma.title.upsert({
      where: { slug: args.slug },
      update: {},
      create: {
        slug: args.slug,
        type: TitleType.MOVIE,
        title: args.title,
        synopsis: args.synopsis,
        categoryId: args.categoryId,
        published: true,
        publishedAt: new Date(),
      },
    });
    await prisma.episode.upsert({
      where: {
        titleId_seasonNumber_episodeNumber: { titleId: t.id, seasonNumber: 1, episodeNumber: 1 },
      },
      update: {},
      create: {
        titleId: t.id,
        seasonNumber: 1,
        episodeNumber: 1,
        name: args.title,
        synopsis: args.synopsis,
        videoPath: `${args.slug}/main.mp4`,
        durationSec: args.durationSec,
        previewSec: args.previewSec,
      },
    });
    for (const instrId of args.instructors ?? []) {
      await prisma.titleInstructor.upsert({
        where: { titleId_instructorId: { titleId: t.id, instructorId: instrId } },
        update: {},
        create: { titleId: t.id, instructorId: instrId, role: "Sunucu" },
      });
    }
    return t;
  }

  await series({
    slug: "lider-dogmaz-olusur",
    title: "Lider Doğmaz, Oluşur",
    synopsis:
      "Ekip kurmaktan kültür inşa etmeye; modern liderliğin temel pratiklerini 6 bölümde derliyoruz.",
    categoryId: liderlik.id,
    instructors: [mentorA.id],
    episodes: [
      { name: "Niyet ve Vizyon", synopsis: "Takımına yön veren lider olmak.", durationSec: 1320, previewSec: 60 },
      { name: "Zor Kararlar", synopsis: "Belirsizlikte karar verme ritüelleri.", durationSec: 1410, previewSec: 60 },
      { name: "Güven Kültürü", synopsis: "Ekibi psikolojik güvende tutmak.", durationSec: 1200, previewSec: 60 },
      { name: "Büyüme", synopsis: "Scale-up dönüşümleri.", durationSec: 1500, previewSec: 60 },
    ],
  });

  await series({
    slug: "sifirdan-girisim",
    title: "Sıfırdan Girişim",
    synopsis: "İlk 100 gününde ürün, ekip ve fon: pratik bir yol haritası.",
    categoryId: girisimcilik.id,
    instructors: [mentorA.id],
    episodes: [
      { name: "Problem-Market Fit", synopsis: "Doğru problemi bulmak.", durationSec: 1380, previewSec: 60 },
      { name: "MVP Kurgusu", synopsis: "Az yapıp çok öğrenmek.", durationSec: 1260, previewSec: 60 },
      { name: "İlk Ekip", synopsis: "İlk 5 çalışan.", durationSec: 1440, previewSec: 60 },
    ],
  });

  await series({
    slug: "pazarlama-seri",
    title: "Pazarlamada Marka Sesi",
    synopsis: "B2B ve B2C markalar için tutarlı ses geliştirmek.",
    categoryId: pazarlama.id,
    instructors: [mentorB.id],
    episodes: [
      { name: "Ses Haritası", synopsis: "Markanın tonunu çıkarmak.", durationSec: 1320, previewSec: 60 },
      { name: "İçerik Ritmi", synopsis: "Kanal bazlı yayın tempo.", durationSec: 1260, previewSec: 60 },
      { name: "Topluluk", synopsis: "Müşteriyi topluluğa çevirmek.", durationSec: 1380, previewSec: 60 },
    ],
  });

  await movie({
    slug: "yarinlari-tasarlamak",
    title: "Yarınları Tasarlamak",
    synopsis: "10 kurucunun gözünden dönüşüm belgeseli.",
    categoryId: belgesel.id,
    durationSec: 3600,
    previewSec: 90,
  });

  await movie({
    slug: "sunum-sanati",
    title: "Sunum Sanatı — Masterclass",
    synopsis: "Kurul önünde, yatırımcı karşısında, sahnede güçlü sunum.",
    categoryId: masterclass.id,
    durationSec: 4200,
    previewSec: 90,
    instructors: [mentorB.id],
  });

  await movie({
    slug: "kariyer-sicrayisi",
    title: "Kariyerde Sıçrayış",
    synopsis: "İç transferden role shift'e, net kariyer hamleleri.",
    categoryId: kariyerGelisim.id,
    durationSec: 2400,
    previewSec: 60,
  });

  console.log("Seed completed");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
