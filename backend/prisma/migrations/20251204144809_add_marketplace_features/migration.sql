-- CreateTable
CREATE TABLE "TemplateReview" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateComment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateReview_templateId_idx" ON "TemplateReview"("templateId");

-- CreateIndex
CREATE INDEX "TemplateReview_userId_idx" ON "TemplateReview"("userId");

-- CreateIndex
CREATE INDEX "TemplateReview_rating_idx" ON "TemplateReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateReview_templateId_userId_key" ON "TemplateReview"("templateId", "userId");

-- CreateIndex
CREATE INDEX "TemplateComment_templateId_idx" ON "TemplateComment"("templateId");

-- CreateIndex
CREATE INDEX "TemplateComment_userId_idx" ON "TemplateComment"("userId");

-- CreateIndex
CREATE INDEX "TemplateComment_parentId_idx" ON "TemplateComment"("parentId");

-- CreateIndex
CREATE INDEX "TemplateComment_createdAt_idx" ON "TemplateComment"("createdAt");

-- AddForeignKey
ALTER TABLE "TemplateReview" ADD CONSTRAINT "TemplateReview_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateReview" ADD CONSTRAINT "TemplateReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateComment" ADD CONSTRAINT "TemplateComment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateComment" ADD CONSTRAINT "TemplateComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateComment" ADD CONSTRAINT "TemplateComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TemplateComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
