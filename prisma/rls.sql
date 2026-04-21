alter table "user"         enable row level security;
alter table session        enable row level security;
alter table account        enable row level security;
alter table verification   enable row level security;
alter table organization   enable row level security;
alter table member         enable row level security;
alter table invitation     enable row level security;

alter table "Category"               enable row level security;
alter table "Title"                  enable row level security;
alter table "Episode"                enable row level security;
alter table "Instructor"             enable row level security;
alter table "TitleInstructor"        enable row level security;
alter table "Progress"               enable row level security;
alter table "IndividualSubscription" enable row level security;
alter table "CompanyProfile"         enable row level security;
alter table "CorporateLead"          enable row level security;

create index if not exists title_published_recent_idx
  on "Title" ("publishedAt" desc, "createdAt" desc)
  where published = true;
