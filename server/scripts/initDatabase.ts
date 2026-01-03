import { db } from "../db";
import { users } from "@shared/schema";
import bcrypt from "bcrypt";

async function initDatabase() {
  console.log("Initializing database with admin user...");
  
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    
    const adminUser = {
      username: "admin",
      email: "admin@engie.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "KLYXOR",
      role: "admin" as const,
      status: "active" as const,
      modules: {
        contracts: true,
        indexation: true,
        validation: true,
        reporting: true,
        security: true,
        payments: true,
        admin: true
      },
      businessUnit: "ENGIE Solutions France"
    };
    
    // Check if admin exists
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      await db.insert(users).values(adminUser);
      console.log("Admin user created successfully");
      console.log("Username: admin");
      console.log("Password: Admin123!");
    } else {
      console.log("Users already exist in database");
    }
    
    console.log("Database initialization complete!");
    
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Run if called directly
initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

export { initDatabase };