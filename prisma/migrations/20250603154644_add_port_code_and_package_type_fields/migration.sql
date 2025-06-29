-- AlterTable
ALTER TABLE "Handover" ADD COLUMN "file_name" TEXT;

-- AlterTable
ALTER TABLE "Parcel" ADD COLUMN "package_type" TEXT;
ALTER TABLE "Parcel" ADD COLUMN "port_code" TEXT;
