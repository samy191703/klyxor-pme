import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin5"));

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await db.insert(users).values({
      username: "admin5",
      password: hashedPassword,
      name: "Administrateur ENGIE",
      email: "admin@engie.com",
      role: "admin",
    });

    console.log("Admin user created successfully");
    console.log("Username: admin5");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
