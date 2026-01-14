import { db } from "@lectio/db";
import { sql } from "drizzle-orm";

async function checkSchema() {
    console.log("Checking schema...");

    try {
        const groupColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'group';
    `);
        console.log("Group Columns:", groupColumns);

        const memberColumns = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'group_member';
    `);
        console.log("Member Columns:", memberColumns);

        // Check if enums exist
        const enums = await db.execute(sql`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('group_type_enum', 'group_role_enum');
    `);
        console.log("Enums:", enums);

    } catch (e) {
        console.error("Error checking schema:", e);
    }
}

checkSchema();
