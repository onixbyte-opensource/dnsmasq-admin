// Prisma 7 moved the connection URL out of schema.prisma into this file, and no longer
// auto-loads .env — hence the explicit dotenv import below. See prisma/schema.prisma for the
// datamodel and prisma/migrations/ for the SQL actually applied to the database.
import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
