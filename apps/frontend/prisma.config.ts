import "dotenv/config"; // add this

// Config file for prisma, pointing to the shared schema in the db package
export default {
  schema: "../../packages/db/prisma/schema.prisma"
};