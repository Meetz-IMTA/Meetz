import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionUrl = new URL(process.env.DATABASE_URL!);
connectionUrl.searchParams.set("connectionLimit", "5");

const adapter = new PrismaMariaDb(connectionUrl.toString());

const prisma = new PrismaClient({ adapter });

export default prisma;
