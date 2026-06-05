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
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: events.indexOf(event) + 1 },
      update: {},
      create: event,
    });
  }

  console.log("Seed terminé : utilisateur + 8 événements créés.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
