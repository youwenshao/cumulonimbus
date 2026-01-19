const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const app = await prisma.app.findFirst({
    where: { subdomain: 'cha-chaan-teng-master-b519' }
  });
  
  if (!app) {
    console.log('App not found');
    return;
  }
  
  console.log('App ID:', app.id);
  console.log('Subdomain:', app.subdomain);
  console.log('Version:', app.version);
  console.log('GeneratedCode keys:', app.generatedCode ? Object.keys(app.generatedCode) : 'null');
  console.log('ComponentFiles keys:', app.componentFiles ? Object.keys(app.componentFiles) : 'null');
  
  if (app.generatedCode && app.generatedCode.pageComponent) {
    console.log('PageComponent length:', app.generatedCode.pageComponent.length);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
