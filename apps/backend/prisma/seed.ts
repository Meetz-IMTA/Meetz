import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "user1@example.com" },
    update: {},
    create: {
      name: "Test User",
      email: "user1@example.com",
      password: hashedPassword,
      isVerified: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "user2@example.com" },
    update: {},
    create: {
      name: "Test User2",
      email: "user2@example.com",
      password: hashedPassword,
      isVerified: true,
    },
  });

  const events = [
    {
      name: "Tournoi de foot en salle",
      description: "Compétition amicale de futsal ouverte à tous les niveaux.",
      date: new Date("2026-06-20T18:00:00"),
      location: "Paris, Gymnase Voltaire",
      category: "Sport",
      maxAttendees: 40,
      organizerId: user2.id,
    },
    {
      name: "Randonnée en forêt de Fontainebleau",
      description: "Balade guidée de 15 km à travers les rochers et les pins.",
      date: new Date("2026-07-05T08:30:00"),
      location: "Fontainebleau, Seine-et-Marne",
      category: "Sport",
      maxAttendees: 25,
      organizerId: user2.id,
    },
    {
      name: "Vernissage — Jeunes artistes contemporains",
      description:
        "Exposition et rencontre avec des peintres et sculpteurs émergents.",
      date: new Date("2026-06-28T18:00:00"),
      location: "Lyon, Galerie Le Cratère",
      category: "Culture",
      maxAttendees: 60,
      organizerId: user2.id,
    },
    {
      name: "Concert jazz en plein air",
      description:
        "Une soirée musicale sous les étoiles avec trois formations locales.",
      date: new Date("2026-07-12T20:00:00"),
      location: "Bordeaux, Place de la Bourse",
      category: "Musique",
      maxAttendees: 200,
      organizerId: user2.id,
    },
    {
      name: "Dégustation vins & tapas",
      description:
        "Sélection de vins régionaux accompagnés de planches de tapas maison.",
      date: new Date("2026-06-18T19:30:00"),
      location: "Toulouse, Les Halles",
      category: "Gastro",
      maxAttendees: 30,
      organizerId: user2.id,
    },
    {
      name: "Atelier cuisine japonaise",
      description:
        "Apprenez à préparer sushis, ramens et gyōzas avec un chef professionnel.",
      date: new Date("2026-07-03T14:00:00"),
      location: "Paris, Studio Umami",
      category: "Gastro",
      maxAttendees: 16,
      organizerId: user2.id,
    },
    {
      name: "Nuit des jeux de société",
      description:
        "Venez découvrir et tester plus de 50 jeux modernes dans une ambiance conviviale.",
      date: new Date("2026-07-18T19:00:00"),
      location: "Lille, Bar Le Ludique",
      category: "Jeux",
      maxAttendees: 50,
      organizerId: user2.id,
    },
    {
      name: "Conférence : comprendre l'IA générative",
      description:
        "Démystifier ChatGPT, Stable Diffusion et les grands modèles de langage.",
      date: new Date("2026-08-02T10:00:00"),
      location: "Nantes, Cité des Congrès",
      category: "Savoir",
      maxAttendees: 120,
      organizerId: user2.id,
    },
    {
      name: "Soirée privée — anniversaire surprise",
      description:
        "Événement réservé aux amis : fête d'anniversaire surprise, chut !",
      date: new Date("2026-07-25T20:00:00"),
      location: "Montpellier, Place de la Comédie",
      category: "Musique",
      maxAttendees: 20,
      isPrivate: true,
      organizerId: user2.id,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: events.indexOf(event) + 1 },
      update: {},
      create: event,
    });
  }

  // user1 et user2 sont amis : user1 voit donc les événements privés de user2.
  await prisma.friendship.upsert({
    where: { userAId_userBId: { userAId: user.id, userBId: user2.id } },
    update: {},
    create: { userAId: user.id, userBId: user2.id },
  });

  const categories = [
    {
      name: "General Discussion",
      description: "Discussions générales sur tous les sujets.",
      icon: "forum",
    },
    {
      name: "Travel",
      description: "Partagez vos voyages, conseils et destinations.",
      icon: "travel_explore",
    },
    {
      name: "Technology",
      description: "Tech, gadgets, développement et innovations.",
      icon: "memory",
    },
    {
      name: "Gaming",
      description: "Jeux vidéo, esport et communauté gaming.",
      icon: "sports_esports",
    },
    {
      name: "Sports",
      description: "Tout l'univers du sport et de la compétition.",
      icon: "sports_soccer",
    },
    {
      name: "Food",
      description: "Recettes, restaurants et plaisirs gourmands.",
      icon: "restaurant",
    },
    {
      name: "Photography",
      description: "Photographie, matériel et partage de clichés.",
      icon: "photo_camera",
    },
    {
      name: "Lifestyle",
      description: "Bien-être, mode de vie et inspiration au quotidien.",
      icon: "spa",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  const existingThreads = await prisma.thread.count();
  if (existingThreads === 0) {
    const general = await prisma.category.findUniqueOrThrow({
      where: { name: "General Discussion" },
    });
    const travel = await prisma.category.findUniqueOrThrow({
      where: { name: "Travel" },
    });
    const tech = await prisma.category.findUniqueOrThrow({
      where: { name: "Technology" },
    });

    const thread1 = await prisma.thread.create({
      data: {
        title: "Bienvenue sur la communauté Meetz 👋",
        content:
          "Présentez-vous, partagez vos centres d'intérêt et faites connaissance ! Ce thread est épinglé pour accueillir les nouveaux membres.",
        authorId: user.id,
        categoryId: general.id,
        isPinned: true,
        viewsCount: 142,
      },
    });

    const thread2 = await prisma.thread.create({
      data: {
        title: "Vos meilleures destinations pour l'été 2026 ?",
        content:
          "Je prépare mes vacances et je cherche de l'inspiration. Quelles sont les destinations que vous recommandez pour un voyage de deux semaines ?",
        authorId: user2.id,
        categoryId: travel.id,
        viewsCount: 87,
      },
    });

    await prisma.thread.create({
      data: {
        title: "Quel framework frontend en 2026 ?",
        content:
          "Angular, React, Vue, Svelte... Le débat est éternel. Qu'utilisez-vous au quotidien et pourquoi ?",
        authorId: user.id,
        categoryId: tech.id,
        viewsCount: 215,
      },
    });

    const comment1 = await prisma.comment.create({
      data: {
        content: "Bienvenue à tous ! Hâte d'échanger avec vous 🚀",
        authorId: user2.id,
        threadId: thread1.id,
      },
    });

    await prisma.comment.create({
      data: {
        content: "Merci pour l'accueil 🙌",
        authorId: user.id,
        threadId: thread1.id,
        parentCommentId: comment1.id,
      },
    });

    await prisma.threadLike.createMany({
      data: [
        { userId: user.id, threadId: thread2.id },
        { userId: user2.id, threadId: thread1.id },
      ],
      skipDuplicates: true,
    });
  }

  console.log(
    "Seed terminé : utilisateurs + événements + catégories communauté.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
