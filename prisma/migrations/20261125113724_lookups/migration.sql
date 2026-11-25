-- CreateTable
CREATE TABLE "PropertyType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "PartnerType" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- Starting rows (master data). Inserted BEFORE the foreign keys below are attached,
-- so rows that already exist in Partner and Property stay valid.
INSERT INTO "PropertyType" ("code", "label", "sortOrder") VALUES
    ('house', 'House', 1),
    ('condo_unit', 'Condo unit', 2),
    ('land', 'Land', 3),
    ('whole_building', 'Whole building', 4),
    ('commercial', 'Commercial', 5),
    ('other', 'Other', 6);

INSERT INTO "PartnerType" ("code", "label", "sortOrder") VALUES
    ('tax_accountant', 'Tax accountant', 1),
    ('judicial_scrivener', 'Judicial scrivener', 2),
    ('lawyer', 'Lawyer', 3);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Partner" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Partner_type_fkey" FOREIGN KEY ("type") REFERENCES "PartnerType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Partner" ("createdAt", "id", "name", "type", "updatedAt") SELECT "createdAt", "id", "name", "type", "updatedAt" FROM "Partner";
DROP TABLE "Partner";
ALTER TABLE "new_Partner" RENAME TO "Partner";
CREATE TABLE "new_Property" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "estimatedPrice" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Property_type_fkey" FOREIGN KEY ("type") REFERENCES "PropertyType" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Property" ("address", "createdAt", "estimatedPrice", "id", "type", "updatedAt") SELECT "address", "createdAt", "estimatedPrice", "id", "type", "updatedAt" FROM "Property";
DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
