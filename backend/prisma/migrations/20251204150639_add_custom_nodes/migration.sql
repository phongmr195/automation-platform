-- CreateTable
CREATE TABLE "CustomNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "iconUrl" TEXT,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "repository" TEXT,
    "homepage" TEXT,
    "license" TEXT,
    "keywords" TEXT[],
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "CustomNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomNodeVersion" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "changelog" TEXT,
    "code" TEXT NOT NULL,
    "compiled" TEXT,
    "sourceMap" TEXT,
    "dependencies" JSONB,
    "definition" JSONB NOT NULL,
    "properties" JSONB NOT NULL,
    "credentials" JSONB,
    "documentation" JSONB,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "CustomNodeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomNodeInstall" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomNodeInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomNodeReview" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomNodeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomNode_name_key" ON "CustomNode"("name");

-- CreateIndex
CREATE INDEX "CustomNode_name_idx" ON "CustomNode"("name");

-- CreateIndex
CREATE INDEX "CustomNode_category_idx" ON "CustomNode"("category");

-- CreateIndex
CREATE INDEX "CustomNode_published_idx" ON "CustomNode"("published");

-- CreateIndex
CREATE INDEX "CustomNode_featured_idx" ON "CustomNode"("featured");

-- CreateIndex
CREATE INDEX "CustomNode_downloads_idx" ON "CustomNode"("downloads");

-- CreateIndex
CREATE INDEX "CustomNode_rating_idx" ON "CustomNode"("rating");

-- CreateIndex
CREATE INDEX "CustomNodeVersion_nodeId_idx" ON "CustomNodeVersion"("nodeId");

-- CreateIndex
CREATE INDEX "CustomNodeVersion_version_idx" ON "CustomNodeVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "CustomNodeVersion_nodeId_version_key" ON "CustomNodeVersion"("nodeId", "version");

-- CreateIndex
CREATE INDEX "CustomNodeInstall_nodeId_idx" ON "CustomNodeInstall"("nodeId");

-- CreateIndex
CREATE INDEX "CustomNodeInstall_organizationId_idx" ON "CustomNodeInstall"("organizationId");

-- CreateIndex
CREATE INDEX "CustomNodeInstall_userId_idx" ON "CustomNodeInstall"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomNodeInstall_nodeId_organizationId_userId_key" ON "CustomNodeInstall"("nodeId", "organizationId", "userId");

-- CreateIndex
CREATE INDEX "CustomNodeReview_nodeId_idx" ON "CustomNodeReview"("nodeId");

-- CreateIndex
CREATE INDEX "CustomNodeReview_userId_idx" ON "CustomNodeReview"("userId");

-- CreateIndex
CREATE INDEX "CustomNodeReview_rating_idx" ON "CustomNodeReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "CustomNodeReview_nodeId_userId_key" ON "CustomNodeReview"("nodeId", "userId");

-- AddForeignKey
ALTER TABLE "CustomNodeVersion" ADD CONSTRAINT "CustomNodeVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CustomNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomNodeInstall" ADD CONSTRAINT "CustomNodeInstall_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CustomNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomNodeInstall" ADD CONSTRAINT "CustomNodeInstall_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomNodeReview" ADD CONSTRAINT "CustomNodeReview_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CustomNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
