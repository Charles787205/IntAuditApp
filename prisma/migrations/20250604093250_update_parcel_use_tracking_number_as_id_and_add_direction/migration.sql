/*
  Warnings:

  - The primary key for the `Parcel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Parcel` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Parcel" (
    "tracking_number" TEXT NOT NULL PRIMARY KEY,
    "port_code" TEXT,
    "package_type" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'forward',
    "updated_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "handover_id" INTEGER,
    CONSTRAINT "Parcel_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "Handover" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Parcel" ("created_at", "handover_id", "package_type", "port_code", "status", "tracking_number", "updated_at", "updated_by") SELECT "created_at", "handover_id", "package_type", "port_code", "status", "tracking_number", "updated_at", "updated_by" FROM "Parcel";
DROP TABLE "Parcel";
ALTER TABLE "new_Parcel" RENAME TO "Parcel";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
