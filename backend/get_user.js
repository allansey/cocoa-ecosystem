const prisma = require('./prismaClient');

async function main() {
  const user = await prisma.user.findFirst();
  if (user) {
    console.log(user.id);
  } else {
    console.log("No user found");
  }
}

main();
