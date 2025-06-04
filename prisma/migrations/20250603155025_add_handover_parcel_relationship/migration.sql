-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Parcel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tracking_number" TEXT NOT NULL,
    "port_code" TEXT,
    "package_type" TEXT,
    "updated_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "handover_id" INTEGER,
    CONSTRAINT "Parcel_handover_id_fkey" FOREIGN KEY ("handover_id") REFERENCES "Handover" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Parcel" ("created_at", "id", "package_type", "port_code", "status", "tracking_number", "updated_at", "updated_by") SELECT "created_at", "id", "package_type", "port_code", "status", "tracking_number", "updated_at", "updated_by" FROM "Parcel";
DROP TABLE "Parcel";
ALTER TABLE "new_Parcel" RENAME TO "Parcel";
CREATE UNIQUE INDEX "Parcel_tracking_number_key" ON "Parcel"("tracking_number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
