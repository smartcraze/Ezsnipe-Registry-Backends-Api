/*
  Warnings:

  - A unique constraint covering the columns `[version]` on the table `ComponentVersion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ComponentVersion_version_key" ON "ComponentVersion"("version");
