import bcrypt from "bcrypt";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const USERS_TO_RESET = [
  { username: "admin1", password: "Admin123!" },
  { username: "admin2", password: "Admin123!" },
  { username: "admin3", password: "Admin123!" },
  { username: "gestionnaire1", password: "Gest123!" },
  { username: "gestionnaire2", password: "Gest123!" },
  { username: "gestionnaire3", password: "Gest123!" },
  { username: "validateur1", password: "Valid123!" },
  { username: "validateur2", password: "Valid123!" },
  { username: "validateur3", password: "Valid123!" },
];

async function resetPasswords() {
  console.log("Réinitialisation des mots de passe...");
  
  for (const user of USERS_TO_RESET) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, user.username));
      console.log(`✓ Mot de passe réinitialisé pour ${user.username}`);
    } catch (error) {
      console.error(`✗ Erreur pour ${user.username}:`, error);
    }
  }
  
  console.log("Terminé !");
  process.exit(0);
}

resetPasswords().catch(console.error);