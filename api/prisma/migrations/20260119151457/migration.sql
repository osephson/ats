-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobUrl" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "JobUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobUrlTag" (
    "jobUrlId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "JobUrlTag_pkey" PRIMARY KEY ("jobUrlId","tagId")
);

-- CreateTable
CREATE TABLE "Open" (
    "id" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "jobUrlId" TEXT NOT NULL,

    CONSTRAINT "Open_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "JobUrl_url_key" ON "JobUrl"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "JobUrlTag_tagId_idx" ON "JobUrlTag"("tagId");

-- CreateIndex
CREATE INDEX "Open_userId_jobUrlId_openedAt_idx" ON "Open"("userId", "jobUrlId", "openedAt");

-- AddForeignKey
ALTER TABLE "JobUrl" ADD CONSTRAINT "JobUrl_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobUrlTag" ADD CONSTRAINT "JobUrlTag_jobUrlId_fkey" FOREIGN KEY ("jobUrlId") REFERENCES "JobUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobUrlTag" ADD CONSTRAINT "JobUrlTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Open" ADD CONSTRAINT "Open_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Open" ADD CONSTRAINT "Open_jobUrlId_fkey" FOREIGN KEY ("jobUrlId") REFERENCES "JobUrl"("id") ON DELETE CASCADE ON UPDATE CASCADE;
