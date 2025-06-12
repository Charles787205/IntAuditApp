-- CreateTable
CREATE TABLE "Courier" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isLazada" BOOLEAN NOT NULL DEFAULT false,
    "isShopee" BOOLEAN NOT NULL DEFAULT false,
    "lazRate" REAL,
    "shopeeRate" REAL,
    "type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
