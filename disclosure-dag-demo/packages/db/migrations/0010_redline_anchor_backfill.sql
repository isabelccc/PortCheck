UPDATE "document_versions"
SET "redline_anchor_content" = "content"
WHERE "redline_anchor_content" IS NULL;
