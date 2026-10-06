-- Tests personnalisés : plusieurs domaines/thématiques/niveaux, limite de temps, questions tirées

-- DropForeignKey
ALTER TABLE "quiz_sessions" DROP CONSTRAINT "quiz_sessions_domain_id_fkey";

-- AlterTable
ALTER TABLE "quiz_sessions" ALTER COLUMN "domain_id" DROP NOT NULL,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "filters" JSONB,
ADD COLUMN     "question_ids" TEXT[],
ADD COLUMN     "time_limit_minutes" INTEGER;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains"("id") ON DELETE SET NULL ON UPDATE CASCADE;
