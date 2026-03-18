-- CreateTable for reservation error tracking
CREATE TABLE "reservation_errors" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "error_type" TEXT NOT NULL,
    "error_category" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "context" JSONB,
    "stack" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution" TEXT,

    CONSTRAINT "reservation_errors_pkey" PRIMARY KEY ("id")
);

-- Create indexes for error tracking queries
CREATE INDEX "reservation_errors_error_category_idx" ON "reservation_errors"("error_category");
CREATE INDEX "reservation_errors_timestamp_idx" ON "reservation_errors"("timestamp");
CREATE INDEX "reservation_errors_is_resolved_idx" ON "reservation_errors"("is_resolved");

-- Add comments for database documentation
COMMENT ON TABLE "reservation_errors" IS 'Tracks detailed information about errors occurring in the reservation system';
COMMENT ON COLUMN "reservation_errors"."error_category" IS 'Categorized error types specific to reservation operations';
COMMENT ON COLUMN "reservation_errors"."context" IS 'JSON context data related to the error, including request and reservation details';
