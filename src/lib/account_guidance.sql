-- Create the table for storing editable account descriptions
create table if not exists account_guidance (
    account_id text primary key,
    description text not null,
    updated_at timestamptz default now(),
    updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table account_guidance enable row level security;

-- Policies
-- Everyone can read the guidance
create policy "Public read access" 
  on account_guidance for select 
  using (true);

-- Authenticated users (CFA/CRA) can update/insert
-- Ideally restricts to CFA only, but for now allowing authenticated users to support the "edit" feature
create policy "Authenticated insert" 
  on account_guidance for insert 
  with check (auth.role() = 'authenticated');

create policy "Authenticated update" 
  on account_guidance for update 
  using (auth.role() = 'authenticated');
