const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.app.findMany({
    select: { id: true, name: true, subdomain: true }
  });
  console.log('Apps in database:');
  console.table(apps);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
