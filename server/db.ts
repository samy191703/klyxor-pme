import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

export const pool = new Pool({ connectionString: process.env.DATABASE_URL  || "postgresql://neondb_owner:npg_U0jckgSn7bpH@ep-long-cake-a4vm1wxl-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });
export const db = drizzle({ client: pool, schema });