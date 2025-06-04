-- CreateTable
CREATE TABLE "Handover" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "handover_date" DATETIME NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "platform" TEXT
);

-- CreateTable
CREATE TABLE "Parcel" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tracking_number" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Export" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "export_name" TEXT NOT NULL,
    "date_uploaded" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "export_dir" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ParcelEventLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tracking_number" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "new_status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Parcel_tracking_number_key" ON "Parcel"("tracking_number");
