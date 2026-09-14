-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'SALES', 'COORDINATOR');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'VISIT', 'DESIGN', 'PRESENTED', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('CEILING', 'KITCHEN', 'FULLHOME', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('AD_KITCHEN', 'AD_FULLHOME', 'AD_CEILING', 'AD_COMMERCIAL', 'INSTAGRAM', 'REFERRAL', 'TRADE', 'WALKIN');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('NOS', 'SQFT', 'RFT', 'LUMP');

-- CreateEnum
CREATE TYPE "MilestoneKey" AS ENUM ('TOKEN', 'PRODUCTION', 'DELIVERY', 'HANDOVER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinHash" TEXT,
    "pinFailures" INTEGER NOT NULL DEFAULT 0,
    "pinLockedTill" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "place" TEXT,
    "type" "WorkType" NOT NULL DEFAULT 'KITCHEN',
    "source" "LeadSource" NOT NULL DEFAULT 'WALKIN',
    "budgetNote" TEXT,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "furthest" "LeadStage" NOT NULL DEFAULT 'NEW',
    "stageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextCall" DATE,
    "lostReason" TEXT,
    "waFirstAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "remarks" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL,
    "nextCall" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "no" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "rev" INTEGER NOT NULL DEFAULT 1,
    "leadId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "place" TEXT,
    "phone" TEXT,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validityDays" INTEGER NOT NULL DEFAULT 30,
    "preparedById" TEXT,
    "showOffer" BOOLEAN NOT NULL DEFAULT false,
    "offerPct" INTEGER NOT NULL DEFAULT 30,
    "gstPct" INTEGER NOT NULL DEFAULT 18,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRoom" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "spec" TEXT,
    "unit" "Unit" NOT NULL DEFAULT 'NOS',
    "size" TEXT,
    "qty" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markupPct" DECIMAL(6,2) NOT NULL DEFAULT 45,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "quoteId" TEXT,
    "client" TEXT NOT NULL,
    "type" "WorkType" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "promisedDate" DATE,
    "handoverDate" DATE,
    "pressingUnit" TEXT,
    "coordinatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStep" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "reachedAt" DATE NOT NULL,

    CONSTRAINT "ProjectStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" "MilestoneKey" NOT NULL,
    "pct" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueAt" DATE,
    "receivedAt" DATE,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateItem" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "spec" TEXT,
    "unit" "Unit" NOT NULL DEFAULT 'NOS',
    "cost" DECIMAL(12,2) NOT NULL,
    "markupPct" DECIMAL(6,2) NOT NULL DEFAULT 45,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSpend" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "campaign" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "CampaignSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyTarget" (
    "month" TEXT NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "MonthlyTarget_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_stage_idx" ON "Lead"("stage");

-- CreateIndex
CREATE INDEX "Lead_nextCall_idx" ON "Lead"("nextCall");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Call_leadId_createdAt_idx" ON "Call"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_no_key" ON "Quote"("no");

-- CreateIndex
CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");

-- CreateIndex
CREATE INDEX "Quote_base_rev_idx" ON "Quote"("base", "rev");

-- CreateIndex
CREATE INDEX "QuoteRoom_quoteId_position_idx" ON "QuoteRoom"("quoteId", "position");

-- CreateIndex
CREATE INDEX "QuoteItem_roomId_position_idx" ON "QuoteItem"("roomId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Project_leadId_key" ON "Project"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_quoteId_key" ON "Project"("quoteId");

-- CreateIndex
CREATE INDEX "Project_step_idx" ON "Project"("step");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStep_projectId_step_key" ON "ProjectStep"("projectId", "step");

-- CreateIndex
CREATE INDEX "Payment_dueAt_idx" ON "Payment"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_projectId_key_key" ON "Payment"("projectId", "key");

-- CreateIndex
CREATE INDEX "RateItem_group_name_idx" ON "RateItem"("group", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSpend_month_campaign_key" ON "CampaignSpend"("month", "campaign");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_preparedById_fkey" FOREIGN KEY ("preparedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRoom" ADD CONSTRAINT "QuoteRoom_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "QuoteRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStep" ADD CONSTRAINT "ProjectStep_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
