/**
 * Script de test pour vérifier les livres
 * 
 * Usage: bun run test-books.ts
 */

import { db, document, user, eq, isNull } from "@lectio/db";

async function testBooks() {
  console.log("📚 Test des livres...\n");

  try {
    // 1. Compter les livres personnels
    const personalBooks = await db
      .select()
      .from(document)
      .where(isNull(document.groupId));

    console.log(`📖 Livres personnels: ${personalBooks.length}`);
    personalBooks.forEach(book => {
      console.log(`   - ${book.title} (${book.filename})`);
    });

    // 2. Compter les livres de groupe
    const groupBooks = await db
      .select()
      .from(document)
      .where(eq(document.groupId, document.groupId)); // Not null

    console.log(`\n👥 Livres de groupe: ${groupBooks.length}`);
    groupBooks.forEach(book => {
      console.log(`   - ${book.title} (groupe: ${book.groupId})`);
    });

    // 3. Tous les livres
    const allBooks = await db.select().from(document);
    console.log(`\n📚 Total de livres: ${allBooks.length}`);

  } catch (error) {
    console.error("❌ Erreur:", error);
    process.exit(1);
  }

  process.exit(0);
}

testBooks();

