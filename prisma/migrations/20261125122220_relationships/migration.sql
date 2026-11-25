-- CreateTable
CREATE TABLE "RelationshipType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- Starting rows (master data). "other" covers anything not in the list.
INSERT INTO "RelationshipType" ("code", "label", "sortOrder") VALUES
    ('spouse', 'Spouse', 1),
    ('son', 'Son', 2),
    ('daughter', 'Daughter', 3),
    ('father', 'Father', 4),
    ('mother', 'Mother', 5),
    ('brother', 'Brother', 6),
    ('sister', 'Sister', 7),
    ('grandchild', 'Grandchild', 8),
    ('nephew_niece', 'Nephew / niece', 9),
    ('other', 'Other', 10);

-- Heirs saved before this change have free text. Keep them valid before the foreign key is added:
-- text that matches a code (e.g. "Son") becomes that code, anything else becomes "other".
UPDATE "Heir" SET "relationship" = lower(trim("relationship"))
    WHERE lower(trim("relationship")) IN (SELECT "code" FROM "RelationshipType");
UPDATE "Heir" SET "relationship" = 'other'
    WHERE "relationship" NOT IN (SELECT "code" FROM "RelationshipType");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Heir" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "caseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "agreed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Heir_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Heir_relationship_fkey" FOREIGN KEY ("relationship") REFERENCES "RelationshipType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Heir" ("agreed", "caseId", "createdAt", "id", "name", "relationship", "updatedAt") SELECT "agreed", "caseId", "createdAt", "id", "name", "relationship", "updatedAt" FROM "Heir";
DROP TABLE "Heir";
ALTER TABLE "new_Heir" RENAME TO "Heir";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
