ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization ENABLE ROW LEVEL SECURITY;
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Title" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Episode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtitle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Instructor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TitleInstructor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TitleOrganization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TitleDepartment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationHiddenTitle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IndividualSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CorporateLead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentQuota" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TranscodeJob" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS title_published_recent_idx
  ON "Title" ("publishedAt" DESC, "createdAt" DESC)
  WHERE published = true;

CREATE OR REPLACE FUNCTION enforce_member_seat_limit() RETURNS trigger AS $$
DECLARE
  seat_limit int;
  current_members int;
BEGIN
  SELECT "seatCount" INTO seat_limit
    FROM "CompanyProfile"
    WHERE "organizationId" = NEW."organizationId"
    FOR UPDATE;

  IF seat_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO current_members
    FROM member
    WHERE "organizationId" = NEW."organizationId";

  IF current_members >= seat_limit THEN
    RAISE EXCEPTION 'seat limit reached for organization %', NEW."organizationId"
      USING errcode = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS member_seat_limit ON member;
CREATE TRIGGER member_seat_limit
  BEFORE INSERT ON member
  FOR EACH ROW EXECUTE FUNCTION enforce_member_seat_limit();
