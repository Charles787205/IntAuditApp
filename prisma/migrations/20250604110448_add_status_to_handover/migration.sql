-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Handover" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "handover_date" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platform" TEXT,
    "file_name" TEXT
);
INSERT INTO "new_Handover" ("date_added", "file_name", "handover_date", "id", "platform", "quantity") SELECT "date_added", "file_name", "handover_date", "id", "platform", "quantity" FROM "Handover";
DROP TABLE "Handover";
ALTER TABLE "new_Handover" RENAME TO "Handover";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
