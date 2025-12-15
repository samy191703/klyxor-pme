const bcrypt = require("bcrypt");

async function run() {
  const hash = await bcrypt.hash("dev123!", 10);
  console.log("HASH =", hash);
}

run();
