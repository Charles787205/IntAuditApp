/*
  Warnings:

  - Added the required column `from_status` to the `ParcelEventLog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ParcelEventLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tracking_number" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_ParcelEventLog" ("created_at", "id", "new_status", "tracking_number", "updated_by") SELECT "created_at", "id", "new_status", "tracking_number", "updated_by" FROM "ParcelEventLog";
DROP TABLE "ParcelEventLog";
ALTER TABLE "new_ParcelEventLog" RENAME TO "ParcelEventLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
