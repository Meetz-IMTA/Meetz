import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "meetz",
  password: "meetz",
  database: "meetz",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

export default prisma