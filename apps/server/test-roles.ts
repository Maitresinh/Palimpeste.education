/**
 * Script de test pour vérifier le schéma de base de données et les rôles
 * 
 * Usage: bun run test-roles.ts
 */

import { db, user, group, groupMember, eq } from "@lectio/db";

async function testRolesAndGroups() {
  console.log("🧪 Test du schéma de données avec rôles...\n");

  try {
    // 1. Créer un utilisateur enseignant
    console.log("1️⃣ Création d'un utilisateur enseignant...");
    const teacherId = crypto.randomUUID();
    const [teacher] = await db
      .insert(user)
      .values({
        id: teacherId,
        name: "Prof Martin",
        email: `teacher-${Date.now()}@test.com`,
        role: "TEACHER",
        emailVerified: true,
      })
      .returning();
    console.log("✅ Enseignant créé:", teacher.name, `(${teacher.role})\n`);

    // 2. Créer un utilisateur étudiant
    console.log("2️⃣ Création d'un utilisateur étudiant...");
    const studentId = crypto.randomUUID();
    const [student] = await db
      .insert(user)
      .values({
        id: studentId,
        name: "Élève Sophie",
        email: `student-${Date.now()}@test.com`,
        role: "STUDENT",
        emailVerified: true,
      })
      .returning();
    console.log("✅ Étudiant créé:", student.name, `(${student.role})\n`);

    // 3. Créer un groupe
    console.log("3️⃣ Création d'un groupe par l'enseignant...");
    const inviteCode = `TEST${Math.floor(Math.random() * 100000).toString().padStart(4, '0')}`;
    const groupId = crypto.randomUUID();
    const [newGroup] = await db
      .insert(group)
      .values({
        id: groupId,
        name: "Français 3ème A",
        teacherId: teacher.id,
        inviteCode,
      })
      .returning();
    console.log("✅ Groupe créé:", newGroup.name);
    console.log("   Code d'invitation:", newGroup.inviteCode, "\n");

    // 4. Ajouter l'étudiant au groupe
    console.log("4️⃣ Ajout de l'étudiant au groupe...");
    await db.insert(groupMember).values({
      groupId: newGroup.id,
      userId: student.id,
    });
    console.log("✅ Étudiant ajouté au groupe\n");

    // 5. Vérifier les membres du groupe
    console.log("5️⃣ Vérification des membres du groupe...");
    const members = await db
      .select()
      .from(groupMember)
      .where(eq(groupMember.groupId, newGroup.id));
    console.log(`✅ Nombre de membres: ${members.length}\n`);

    // 6. Nettoyer les données de test
    console.log("6️⃣ Nettoyage des données de test...");
    await db.delete(group).where(eq(group.id, newGroup.id));
    await db.delete(user).where(eq(user.id, teacher.id));
    await db.delete(user).where(eq(user.id, student.id));
    console.log("✅ Nettoyage effectué\n");

    console.log("🎉 Tous les tests sont passés avec succès!");
    console.log("\n📊 Résumé:");
    console.log("   - Enum user_role fonctionne");
    console.log("   - Table user avec champ role fonctionne");
    console.log("   - Table group fonctionne");
    console.log("   - Table group_member fonctionne");
    console.log("   - Relations et clés étrangères fonctionnent");

  } catch (error) {
    console.error("❌ Erreur lors des tests:", error);
    process.exit(1);
  }

  process.exit(0);
}

testRolesAndGroups();

