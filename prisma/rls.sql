alter table "user"         enable row level security;
alter table session        enable row level security;
alter table account        enable row level security;
alter table verification   enable row level security;
alter table organization   enable row level security;
alter table member         enable row level security;
alter table invitation     enable row level security;

alter table "Department"             enable row level security;

alter table "Category"               enable row level security;
alter table "Title"                  enable row level security;
alter table "Episode"                enable row level security;
alter table "Subtitle"               enable row level security;
alter table "Instructor"             enable row level security;
alter table "TitleInstructor"        enable row level security;
alter table "TitleOrganization"      enable row level security;
alter table "TitleDepartment"        enable row level security;
alter table "OrganizationHiddenTitle" enable row level security;
alter table "Progress"               enable row level security;
alter table "IndividualSubscription" enable row level security;
alter table "CompanyProfile"         enable row level security;
alter table "CorporateLead"          enable row level security;
alter table "AgentConversation"      enable row level security;
alter table "AgentMessage"           enable row level security;
alter table "AgentQuota"             enable row level security;
alter table "StripeEvent"            enable row level security;
alter table "TranscodeJob"           enable row level security;

create index if not exists title_published_recent_idx
  on "Title" ("publishedAt" desc, "createdAt" desc)
  where published = true;

-- Race-free seat cap: reject a member INSERT that would push an organization
-- past its paid CompanyProfile.seatCount. The SELECT ... FOR UPDATE serializes
-- concurrent accepts on the same company row, so the count can't be raced.
-- (Orgs without a CompanyProfile are uncapped — e.g. the owner row created
-- during activation before the profile exists.)
create or replace function enforce_member_seat_limit() returns trigger as $$
declare
  seat_limit int;
  current_members int;
begin
  select "seatCount" into seat_limit
    from "CompanyProfile"
    where "organizationId" = NEW."organizationId"
    for update;

  if seat_limit is null then
    return NEW;
  end if;

  select count(*) into current_members
    from "member"
    where "organizationId" = NEW."organizationId";

  if current_members >= seat_limit then
    raise exception 'seat limit reached for organization %', NEW."organizationId"
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists member_seat_limit on "member";
create trigger member_seat_limit
  before insert on "member"
  for each row execute function enforce_member_seat_limit();
