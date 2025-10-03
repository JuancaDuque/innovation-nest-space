# 🚀 ROUTIFY - Complete Project Specification

## 📋 Project Overview

**Project Name:** Routify  
**Type:** Web Application for Optimal Infrastructure Routing Design  
**Tech Stack:** React + Vite + TypeScript + TailwindCSS + shadcn/ui + OpenLayers + Supabase (PostgreSQL with PostGIS)

**Core Purpose:** Professional routing design tool that generates optimal infrastructure routes by minimizing installation costs while respecting user-defined environmental and social constraints.

---

## 🎯 Core Functionality

Routify enables users to:
1. Define an **Area of Interest (AOI)** by drawing polygons on a map
2. Configure **routing parameters** with customizable weights for different layers
3. Place **origin and destination points** within the AOI
4. Generate **optimal routes** connecting those points
5. View **descriptive analytics** of generated routes
6. **Download results** in multiple formats (GeoJSON, KML, CSV, PDF)

**Key Differentiator:** Unlike standard routing tools, Routify integrates cost optimization with environmental and social justice constraints (e.g., avoiding natural parks, minimizing urban population impact).

---

## 🔐 Authentication & User Management

### Registration System
Implement Supabase authentication with the following user profile fields:

**Required Fields:**
- First name
- Last name
- Email (login credential)

**Optional Fields:**
- Company name
- Job title/position
- Phone number
- Company website
- Address
- City
- State
- Country

### Database: profiles table
```sql
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  company_name text,
  job_title text,
  phone_number text,
  company_website text,
  address text,
  city text,
  state text,
  country text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- RLS Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger to auto-create profile on signup
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Authentication Flow
- **Sign up page** (`/auth`) with email/password
- **Login page** (`/auth`) 
- **Auto-confirm email** enabled in Supabase settings (for development)
- Protected routes redirect to `/auth` if not authenticated
- Session persistence using Supabase client

---

## 📊 Dashboard

### Layout
Professional dashboard displaying all user projects as **cards/tiles** with modern design:

**Card Design:**
- Rounded corners (`rounded-lg`)
- Soft shadows
- Clean, minimal aesthetic
- Hover effects

**Card Content:**
- Project title (bold, large)
- Short description
- Creation date
- Status badge (Active/Archived)
- Current step indicator

**Actions:**
- **Create New Project** button (prominent, primary color)
- **Open Project** (click on card)
- **Archive Project** (dropdown menu on card)
- **Delete Project** (dropdown menu on card)

### Route Comparison Feature
Implement a visual comparison tool that shows:
- Side-by-side route comparison
- Metrics comparison (length, cost, crossings)
- Visual difference highlighting on map

---

## 🗄️ Database Schema (Supabase PostgreSQL + PostGIS)

### 🔌 Database Connection Details

**Connection String for Admin Tools (QGIS, pgAdmin, DBeaver):**
```
Host: <PROJECT_ID>.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Available in Supabase Dashboard → Database Settings → Database Password]
SSL Mode: require
```

**SSL Certificates:** Can be downloaded from Supabase panel if required.

**Frontend Connection:**
- Use Supabase JavaScript client with `anon key`
- Project URL and API keys available in Project Settings → API

### 📂 Database Schemas
- **`public`** - Business logic tables (companies, contacts, projects, profiles)
- **`gis`** - Geospatial tables (AOIs, points, railroads, transmission lines, candidate networks)
- **`graphql_public`** - Default Supabase GraphQL schema (auto-generated)

---

## Schema: `public` (Business Tables)

### companies
Stores company/organization information.

```sql
create table public.companies (
  company_id uuid primary key default gen_random_uuid(),
  name text unique not null,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state_region text,
  postal_code text,
  country_code char(2),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.companies enable row level security;

-- Users can view companies they're associated with via contacts
create policy "Users can view associated companies"
  on public.companies for select
  using (
    exists (
      select 1 from public.contacts
      where contacts.company_id = companies.company_id
      and exists (
        select 1 from auth.users
        where users.id = auth.uid()
        and users.email = contacts.email
      )
    )
  );
```

### contacts
Contact persons within companies.

```sql
create table public.contacts (
  contact_id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(company_id) on delete cascade,
  first_name text not null,
  last_name text not null,
  job_title text,
  email text unique not null,
  phone text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Enforce lowercase email
  constraint email_lowercase check (email = lower(email))
);

alter table public.contacts enable row level security;

create policy "Users can view own contact"
  on public.contacts for select
  using (
    exists (
      select 1 from auth.users
      where users.id = auth.uid()
      and users.email = contacts.email
    )
  );
```

### projects
Main projects table with routing product type.

```sql
-- Create product type enum
create type public.product_type as enum ('routerator', 'segmantor', 'variator', 'plumator');

create table public.projects (
  project_id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(company_id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade not null,
  product public.product_type not null default 'routerator',
  title text not null,
  description text,
  status text default 'active' check (status in ('active', 'archived')),
  start_date date,
  end_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.projects enable row level security;

create policy "Users can view own projects or projects where they are members"
  on public.projects for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.project_members
      where project_members.project_id = projects.project_id
      and project_members.user_id = auth.uid()
    )
  );

create policy "Users can create own projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own projects"
  on public.projects for update
  using (auth.uid() = owner_id);

create policy "Users can delete own projects"
  on public.projects for delete
  using (auth.uid() = owner_id);
```

### project_members
Multi-user collaboration on projects.

```sql
create table public.project_members (
  project_id uuid references public.projects(project_id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamp with time zone default now(),
  
  primary key (project_id, user_id)
);

alter table public.project_members enable row level security;

create policy "Users can view project members if they are a member"
  on public.project_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.projects
      where projects.project_id = project_members.project_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Project owners can add members"
  on public.project_members for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.project_id = project_members.project_id
      and projects.owner_id = auth.uid()
    )
  );
```

---

## Schema: `gis` (Geospatial Tables)

### Global Base Layers (Read-Only Reference Data)

These datasets are **shared across all projects** and serve as national-scale reference layers for routing analysis.

#### gis.railroads
National railroad network dataset.

```sql
create table gis.railroads (
  id integer primary key,
  trkclass integer,
  geom geometry(MultiLineString, 4326) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_railroads_geom on gis.railroads using gist(geom);

-- Read-only for all authenticated users
alter table gis.railroads enable row level security;

create policy "All users can view railroads"
  on gis.railroads for select
  to authenticated
  using (true);
```

**Field Descriptions:**
- `id`: Unique railroad segment identifier (integer)
- `trkclass`: Railroad track classification (represents speed category)
- `geom`: MultiLineString geometry in WGS84 (EPSG:4326)

**Data Source:** National transportation database (shapefile import)

#### gis.transmission_lines
National electrical transmission lines dataset.

```sql
create table gis.transmission_lines (
  id text primary key,
  voltage numeric,
  geom geometry(MultiLineString, 4326) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_transmission_lines_geom on gis.transmission_lines using gist(geom);

alter table gis.transmission_lines enable row level security;

create policy "All users can view transmission lines"
  on gis.transmission_lines for select
  to authenticated
  using (true);
```

**Field Descriptions:**
- `id`: Unique line identifier (text/string)
- `voltage`: Nominal voltage in kilovolts (numeric)
- `geom`: MultiLineString geometry in WGS84

**Coordinate System Definition:**
```
GEOGCS["GCS_WGS_1984",
  DATUM["D_WGS_1984",
    SPHEROID["WGS_1984",6378137.0,298.257223563]],
  PRIMEM["Greenwich",0.0],
  UNIT["Degree",0.0174532925199433]]
```

---

### Project-Specific GIS Data

These tables store **project-derived** spatial data, all linked via `project_id`.

#### gis.aois
Area of Interest polygons for each project.

```sql
create table gis.aois (
  aoi_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(project_id) on delete cascade unique,
  geom geometry(MultiPolygon, 4326) not null,
  name text,
  props jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_aois_geom on gis.aois using gist(geom);

alter table gis.aois enable row level security;

create policy "Users can view own AOIs"
  on gis.aois for select
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = aois.project_id
      and (projects.owner_id = auth.uid() or exists (
        select 1 from public.project_members
        where project_members.project_id = projects.project_id
        and project_members.user_id = auth.uid()
      ))
    )
  );

create policy "Users can insert own AOIs"
  on gis.aois for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.project_id = aois.project_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Users can update own AOIs"
  on gis.aois for update
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = aois.project_id
      and projects.owner_id = auth.uid()
    )
  );
```

**Constraint:** One AOI per project (enforced by `unique` constraint on `project_id`).

**Usage:** When user draws AOI polygon, it triggers automatic clipping of reference layers.

#### gis.railroads_aoi
Railroads clipped to project AOI boundary.

```sql
create table gis.railroads_aoi (
  railroad_aoi_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(project_id) on delete cascade,
  source_railroad_id integer references gis.railroads(id),
  trkclass integer,
  geom geometry(MultiLineString, 4326) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  unique (project_id, source_railroad_id)
);

create index idx_railroads_aoi_geom on gis.railroads_aoi using gist(geom);

alter table gis.railroads_aoi enable row level security;

create policy "Users can view own clipped railroads"
  on gis.railroads_aoi for select
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = railroads_aoi.project_id
      and (projects.owner_id = auth.uid() or exists (
        select 1 from public.project_members
        where project_members.project_id = projects.project_id
        and project_members.user_id = auth.uid()
      ))
    )
  );
```

**Purpose:** Stores only the railroad segments that intersect with the project's AOI.

#### gis.transmission_lines_aoi
Transmission lines clipped to project AOI boundary.

```sql
create table gis.transmission_lines_aoi (
  transmission_line_aoi_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(project_id) on delete cascade,
  source_line_id text references gis.transmission_lines(id),
  voltage numeric,
  geom geometry(MultiLineString, 4326) not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  unique (project_id, source_line_id)
);

create index idx_transmission_lines_aoi_geom on gis.transmission_lines_aoi using gist(geom);

alter table gis.transmission_lines_aoi enable row level security;

create policy "Users can view own clipped transmission lines"
  on gis.transmission_lines_aoi for select
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = transmission_lines_aoi.project_id
      and (projects.owner_id = auth.uid() or exists (
        select 1 from public.project_members
        where project_members.project_id = projects.project_id
        and project_members.user_id = auth.uid()
      ))
    )
  );
```

#### gis.project_points
Origin and destination points for routing.

```sql
create table gis.project_points (
  point_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(project_id) on delete cascade,
  geom geometry(Point, 4326) not null,
  name text,
  props jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_project_points_geom on gis.project_points using gist(geom);

alter table gis.project_points enable row level security;

create policy "Users can view own project points"
  on gis.project_points for select
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = project_points.project_id
      and (projects.owner_id = auth.uid() or exists (
        select 1 from public.project_members
        where project_members.project_id = projects.project_id
        and project_members.user_id = auth.uid()
      ))
    )
  );

create policy "Users can insert own project points"
  on gis.project_points for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.project_id = project_points.project_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Users can delete own project points"
  on gis.project_points for delete
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = project_points.project_id
      and projects.owner_id = auth.uid()
    )
  );
```

**Usage:** Store origin and destination points. Use `props` jsonb field to store custom properties like `{"type": "origin"}` or `{"type": "destination"}`.

#### gis.candidate_network
Generated optimal routes (final output).

```sql
create table gis.candidate_network (
  candidate_network_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(project_id) on delete cascade,
  geom geometry(MultiLineString, 4326) not null,
  length_m double precision,
  props jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_candidate_network_geom on gis.candidate_network using gist(geom);

alter table gis.candidate_network enable row level security;

create policy "Users can view own candidate networks"
  on gis.candidate_network for select
  using (
    exists (
      select 1 from public.projects
      where projects.project_id = candidate_network.project_id
      and (projects.owner_id = auth.uid() or exists (
        select 1 from public.project_members
        where project_members.project_id = projects.project_id
        and project_members.user_id = auth.uid()
      ))
    )
  );

create policy "Users can insert own candidate networks"
  on gis.candidate_network for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.project_id = candidate_network.project_id
      and projects.owner_id = auth.uid()
    )
  );
```

**Note:** `props` jsonb can store cost estimates, analytics, crossing counts, and other route metadata.

---

## 🔧 Database Functions (RPCs)

### gis.upsert_aoi()
Insert or update AOI polygon for a project (enforces one AOI per project).

```sql
create or replace function gis.upsert_aoi(
  p_project_id uuid,
  p_geom geometry,
  p_name text default null,
  p_props jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, gis
as $$
declare
  v_aoi_id uuid;
begin
  -- Validate geometry is MultiPolygon
  if geometrytype(p_geom) != 'MULTIPOLYGON' then
    p_geom := st_multi(p_geom);
  end if;
  
  insert into gis.aois (project_id, geom, name, props)
  values (p_project_id, p_geom, p_name, p_props)
  on conflict (project_id) 
  do update set 
    geom = excluded.geom,
    name = excluded.name,
    props = excluded.props,
    updated_at = now()
  returning aoi_id into v_aoi_id;
  
  return v_aoi_id;
end;
$$;
```

**Usage from JavaScript:**
```typescript
const { data: aoiId, error } = await supabase.rpc('upsert_aoi', {
  p_project_id: projectId,
  p_geom: geojsonGeometry, // PostGIS handles GeoJSON directly
  p_name: 'My Study Area',
  p_props: { color: 'red', description: 'Northern region' }
});
```

### gis.add_project_point()
Add a point to a project (origin/destination).

```sql
create or replace function gis.add_project_point(
  p_project_id uuid,
  p_lon double precision,
  p_lat double precision,
  p_name text default null,
  p_props jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, gis
as $$
declare
  v_point_id uuid;
begin
  insert into gis.project_points (project_id, geom, name, props)
  values (
    p_project_id,
    st_setsrid(st_makepoint(p_lon, p_lat), 4326),
    p_name,
    p_props
  )
  returning point_id into v_point_id;
  
  return v_point_id;
end;
$$;
```

**Usage:**
```typescript
const { data: pointId, error } = await supabase.rpc('add_project_point', {
  p_project_id: projectId,
  p_lon: -122.4194,
  p_lat: 37.7749,
  p_name: 'Origin Point',
  p_props: { type: 'origin', color: 'green' }
});
```

### gis.clip_project_layers()
Clip railroads and transmission lines to project AOI boundary.

```sql
create or replace function gis.clip_project_layers(
  p_project_id uuid,
  p_replace boolean default false
)
returns table (
  railroads_count integer,
  transmission_lines_count integer
)
language plpgsql
security definer
set search_path = public, gis
as $$
declare
  v_aoi_geom geometry;
  v_railroads_count integer;
  v_transmission_lines_count integer;
begin
  -- Get AOI geometry
  select geom into v_aoi_geom
  from gis.aois
  where project_id = p_project_id;
  
  if v_aoi_geom is null then
    raise exception 'No AOI found for project %', p_project_id;
  end if;
  
  -- Delete existing clipped layers if replace = true
  if p_replace then
    delete from gis.railroads_aoi where project_id = p_project_id;
    delete from gis.transmission_lines_aoi where project_id = p_project_id;
  end if;
  
  -- Clip railroads to AOI
  insert into gis.railroads_aoi (project_id, source_railroad_id, trkclass, geom)
  select 
    p_project_id,
    r.id,
    r.trkclass,
    st_intersection(r.geom, v_aoi_geom)
  from gis.railroads r
  where st_intersects(r.geom, v_aoi_geom)
  on conflict (project_id, source_railroad_id) do nothing;
  
  get diagnostics v_railroads_count = row_count;
  
  -- Clip transmission lines to AOI
  insert into gis.transmission_lines_aoi (project_id, source_line_id, voltage, geom)
  select 
    p_project_id,
    t.id,
    t.voltage,
    st_intersection(t.geom, v_aoi_geom)
  from gis.transmission_lines t
  where st_intersects(t.geom, v_aoi_geom)
  on conflict (project_id, source_line_id) do nothing;
  
  get diagnostics v_transmission_lines_count = row_count;
  
  return query select v_railroads_count, v_transmission_lines_count;
end;
$$;
```

**Usage:**
```typescript
const { data, error } = await supabase.rpc('clip_project_layers', {
  p_project_id: projectId,
  p_replace: true // Set to true to delete existing clipped layers first
});

if (data) {
  console.log(`Clipped ${data[0].railroads_count} railroad segments`);
  console.log(`Clipped ${data[0].transmission_lines_count} transmission line segments`);
}
```

---

## 📦 Supabase Storage Configuration

### Bucket: BaseData

**Purpose:** Centralized storage for raster datasets (land cover) and project-specific exports.

**Bucket Structure:**
```
BaseData/
├── baseRasters/
│   └── 720/
│       └── landcover_720.tif         # National land cover raster (720m resolution)
└── projects/
    └── {project_id}/
        ├── landcover_clip.tif         # Land cover clipped to AOI
        ├── railroads_clip.geojson     # Optional: clipped railroads export
        ├── transmission_lines_clip.geojson
        └── downloads/
            ├── aoi.geojson
            ├── route.geojson
            ├── route.kml
            └── report.csv
```

### Bucket Configuration

**Access Level:** Initially set to **private** with signed URLs for secure access.

**SQL to create bucket (if needed):**
```sql
insert into storage.buckets (id, name, public)
values ('BaseData', 'BaseData', false);
```

**Storage Policies:**

```sql
-- Allow authenticated users to read base rasters
create policy "Allow authenticated users to read base rasters"
on storage.objects for select
using (
  bucket_id = 'BaseData'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = 'baseRasters'
);

-- Allow users to read/write their own project folders
create policy "Users can access own project files"
on storage.objects for select
using (
  bucket_id = 'BaseData'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1 from public.projects
    where projects.project_id::text = (storage.foldername(name))[2]
    and (projects.owner_id = auth.uid() or exists (
      select 1 from public.project_members
      where project_members.project_id = projects.project_id
      and project_members.user_id = auth.uid()
    ))
  )
);

create policy "Users can upload to own project folders"
on storage.objects for insert
with check (
  bucket_id = 'BaseData'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = 'projects'
  and exists (
    select 1 from public.projects
    where projects.project_id::text = (storage.foldername(name))[2]
    and projects.owner_id = auth.uid()
  )
);
```

---

## 🗺️ Six-Step Sequential Workflow

The project progresses through **six sequential tabs**. Each tab is locked until the previous step is completed (controlled by `current_step` field in projects table).

### Step 1: Define Area of Interest (AOI)

**Component:** `StepAOI.tsx`

**Features:**
- Interactive map using OpenLayers
- Drawing tools:
  - Draw polygon (freehand or click-to-draw)
  - Clear/delete polygon
- Base map selector:
  - OpenStreetMap (default)
  - Satellite (Esri World Imagery)
  - Terrain (OpenTopoMap)
  - Dark mode (CartoDB Dark)
- Base map opacity slider (0.2 - 1.0)
- Map controls:
  - Zoom in/out
  - Reset view to full extent

**Workflow:**
1. User draws polygon on map
2. Click **Save AOI** button
3. Backend:
   - Converts polygon to WKT format
   - Calls `gis.upsert_aoi()` RPC
   - Automatically triggers `gis.clip_project_layers()` to clip reference datasets
4. Updates `projects.current_step = 2`
5. User proceeds to Step 2

**Technical Implementation:**
```typescript
// Transform between coordinate systems
import { fromLonLat, toLonLat } from 'ol/proj';
import WKT from 'ol/format/WKT';
import GeoJSON from 'ol/format/GeoJSON';

const saveAOI = async () => {
  // Get drawn feature
  const features = vectorSource.getFeatures();
  if (features.length === 0) return;
  
  const feature = features[0];
  const geometry = feature.getGeometry();
  
  // Transform to EPSG:4326 (WGS84)
  const geom4326 = geometry.clone().transform('EPSG:3857', 'EPSG:4326');
  
  // Convert to WKT for PostGIS
  const wktFormat = new WKT();
  const wkt = wktFormat.writeGeometry(geom4326);
  
  // Save to database
  const { data, error } = await supabase.rpc('upsert_aoi', {
    p_project_id: projectId,
    p_geom: wkt,
    p_name: 'Project AOI'
  });
  
  if (!error) {
    // Trigger clipping
    await supabase.rpc('clip_project_layers', {
      p_project_id: projectId,
      p_replace: true
    });
    
    // Update project step
    await supabase
      .from('projects')
      .update({ current_step: 2 })
      .eq('project_id', projectId);
  }
};
```

**Design:**
- Clean card layout with rounded corners
- Floating map controls (top-right)
- Base map selector (bottom-left floating panel)
- Primary action button (Save AOI) - full width at bottom
- Loading states with spinner
- Success/error toast notifications

---

### Step 2: Configure Routing Parameters

**Component:** `StepParameters.tsx`

**Features:**
- Tabular interface for parameter weights
- Three categories of weights:
  1. **General Weights** (Land Cover subcategories only)
  2. **Corridor Weights** (Transmission Lines + Railroads)
  3. **Barrier Weights** (Railroads only)

**Parameter Structure:**
```typescript
interface ParameterRow {
  layer: string;           // "Land Cover", "Transmission Lines", "Railroads"
  subcategory: string;     // Specific subcategory
  generalWeight: number;   // 0-1 (only for Land Cover)
  corridorWeight: number;  // 0-1 (Transmission + Railroads)
  barrierWeight: number;   // 0-1 (only for Railroads)
  enabled: boolean;        // Toggle layer inclusion
}
```

**Default Parameters:**
```typescript
const defaultParameters: ParameterRow[] = [
  // Land Cover
  { layer: "Land Cover", subcategory: "Developed", generalWeight: 0.8, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Forest", generalWeight: 0.4, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Cropland", generalWeight: 0.6, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Wetlands", generalWeight: 0.3, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Water", generalWeight: 0.9, corridorWeight: 0, barrierWeight: 0, enabled: true },
  
  // Transmission Lines
  { layer: "Transmission Lines", subcategory: "< 100kV", generalWeight: 0, corridorWeight: 0.7, barrierWeight: 0, enabled: true },
  { layer: "Transmission Lines", subcategory: "100-200kV", generalWeight: 0, corridorWeight: 0.8, barrierWeight: 0, enabled: true },
  { layer: "Transmission Lines", subcategory: "> 200kV", generalWeight: 0, corridorWeight: 0.9, barrierWeight: 0, enabled: true },
  
  // Railroads
  { layer: "Railroads", subcategory: "Low Speed", generalWeight: 0, corridorWeight: 0.6, barrierWeight: 0.3, enabled: true },
  { layer: "Railroads", subcategory: "Medium Speed", generalWeight: 0, corridorWeight: 0.7, barrierWeight: 0.5, enabled: true },
  { layer: "Railroads", subcategory: "High Speed", generalWeight: 0, corridorWeight: 0.8, barrierWeight: 0.7, enabled: true }
];
```

**UI Layout:**
- HTML table with sticky header
- Columns: Layer | Subcategory | General Weight | Corridor Weight | Barrier Weight | Enabled
- Number inputs for weights (min=0, max=1, step=0.1)
- Checkbox for enabled/disabled
- Greyed out cells for non-applicable combinations
- Save button at bottom

**Workflow:**
1. Load existing parameters or use defaults
2. User edits weight values
3. Click **Save Parameters**
4. Store as JSON in `routing_parameters` table (or separate table if preferred)
5. Update `projects.current_step = 3`

**Storage Example:**
```json
{
  "parameters": [
    {
      "layer": "Land Cover",
      "subcategory": "Forest",
      "generalWeight": 0.4,
      "corridorWeight": 0,
      "barrierWeight": 0,
      "enabled": true
    },
    // ... rest of parameters
  ]
}
```

---

### Step 3: Select Origin & Destination Points

**Component:** `StepPoints.tsx`

**Features:**
- Map centered on AOI polygon
- AOI displayed with red border, semi-transparent fill
- Drawing tools:
  - **Add Origin Point** button
  - **Add Destination Point** button
- Base map selector + opacity control
- Visual point markers:
  - Origin: Green circle
  - Destination: Red circle

**Workflow:**
1. Click "Add Origin" → Enter drawing mode
2. Click on map to place origin point
3. Point saved immediately via `gis.add_project_point()` RPC
4. Repeat for destination point
5. When both points exist, "Continue" button becomes enabled
6. Update `projects.current_step = 4`

**Technical Implementation:**
```typescript
const addPoint = async (type: 'origin' | 'destination', lon: number, lat: number) => {
  const { data: pointId, error } = await supabase.rpc('add_project_point', {
    p_project_id: projectId,
    p_lon: lon,
    p_lat: lat,
    p_name: type === 'origin' ? 'Origin' : 'Destination',
    p_props: { type }
  });
  
  if (!error) {
    toast.success(`${type} point added successfully`);
    loadPoints(); // Refresh map
  }
};
```

**Button States:**
- "Add Origin" / "Update Origin" (if origin exists)
- "Add Destination" / "Update Destination" (if destination exists)
- Drawing mode indicator (e.g., "Click on map to place origin")

**Design:**
- Clean map interface
- Floating action buttons (left side)
- Clear visual feedback during drawing
- Toast notifications for success/errors

---

### Step 4: Generate Route

**Component:** `StepRoute.tsx`

**Features:**
- Map displays:
  - AOI polygon (red border, transparent)
  - Origin point (green)
  - Destination point (red)
  - Generated route (blue thick line)
- Base map selector + opacity
- **Generate Route** button (or "Regenerate Route" if route exists)

**Route Generation Logic:**
```typescript
const generateRoute = async () => {
  setGenerating(true);
  
  try {
    // Fetch origin and destination
    const { data: points } = await supabase
      .from('project_points')
      .select('*')
      .eq('project_id', projectId);
    
    const origin = points.find(p => p.props.type === 'origin');
    const destination = points.find(p => p.props.type === 'destination');
    
    if (!origin || !destination) {
      throw new Error('Origin and destination points required');
    }
    
    // TODO: Replace with real optimization algorithm
    // For now, create straight line
    const originCoords = origin.geom.coordinates;
    const destCoords = destination.geom.coordinates;
    
    const routeGeom = {
      type: 'MultiLineString',
      coordinates: [[originCoords, destCoords]]
    };
    
    // Calculate length (Haversine formula or PostGIS ST_Length)
    const lengthKm = calculateDistance(originCoords, destCoords);
    
    // Mock cost calculation
    const cost = lengthKm * 1000; // $1000 per km
    
    // Save to candidate_network
    const { error } = await supabase
      .from('candidate_network')
      .upsert({
        project_id: projectId,
        geom: routeGeom,
        length_m: lengthKm * 1000,
        props: {
          cost_usd: cost,
          generated_at: new Date().toISOString()
        }
      });
    
    if (!error) {
      // Update project step
      await supabase
        .from('projects')
        .update({ current_step: 5 })
        .eq('project_id', projectId);
      
      toast.success('Route generated successfully!');
      loadRoute(); // Refresh map
      onComplete();
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    setGenerating(false);
  }
};
```

**Design:**
- Center map on AOI extent
- Large "Generate Route" button
- Loading spinner during generation
- Success animation when route appears
- Route metadata display (length, estimated time)

---

### Step 5: Route Analytics

**Component:** `StepAnalytics.tsx`

**Features:**
- Dashboard with descriptive metrics

**Metric Cards (Top Row):**
1. **Route Length** - Display in km and miles
2. **Estimated Cost** - Display in USD
3. **Average Elevation** - Display in meters

**Detailed Analytics Sections:**

#### 1. Land Cover Distribution
- Pie chart or horizontal bar chart
- Categories: Forest, Cropland, Developed, Wetlands, Water, etc.
- Percentage of route passing through each type
- Color-coded

#### 2. Infrastructure Crossings
- Table or card list
- **Railroads:**
  - Total crossings count
  - Breakdown by speed class
- **Transmission Lines:**
  - Total crossings count
  - Breakdown by voltage class
- **Pipelines** (if applicable)

#### 3. Elevation Profile
- Line chart (using recharts)
- X-axis: Distance along route (km)
- Y-axis: Elevation (meters)
- Highlight high/low points

**Data Structure (stored in `candidate_network.props`):**
```json
{
  "cost_usd": 125000,
  "length_km": 125,
  "avg_elevation_m": 450,
  "land_cover": {
    "forest": 45,
    "cropland": 30,
    "developed": 15,
    "wetlands": 5,
    "water": 5
  },
  "crossings": {
    "railroads": {
      "total": 3,
      "low_speed": 1,
      "medium_speed": 1,
      "high_speed": 1
    },
    "transmission_lines": {
      "total": 5,
      "lt_100kv": 2,
      "100_200kv": 2,
      "gt_200kv": 1
    }
  },
  "elevation_profile": [
    {"distance_km": 0, "elevation_m": 400},
    {"distance_km": 25, "elevation_m": 500},
    {"distance_km": 50, "elevation_m": 450},
    // ... more points
  ]
}
```

**Current Implementation:**
- Initially use **mock data** for demonstration
- Structure prepared for real analytics integration
- Future: Compute analytics from actual route geometry and clipped layers

**Design:**
- Grid layout for metric cards
- Responsive charts using recharts
- Clean, professional styling
- "Complete" button advances to Step 6

---

### Step 6: Download Results

**Component:** `StepDownload.tsx`

**Features:**
- Download cards for different output formats

**Available Downloads:**

1. **AOI Polygon (GeoJSON)**
   - Icon: `MapPin`
   - Description: "Download the Area of Interest boundary"
   - Format: GeoJSON
   - Source: `gis.aois` table

2. **Route (GeoJSON)**
   - Icon: `Route`
   - Description: "Download the generated route as GeoJSON"
   - Format: GeoJSON
   - Source: `gis.candidate_network` table

3. **Route (KML)**
   - Icon: `FileDown`
   - Description: "Download the route for Google Earth"
   - Format: KML
   - Source: Convert from GeoJSON to KML

4. **Clipped Railroads (GeoJSON)**
   - Icon: `Train`
   - Description: "Download railroads within AOI"
   - Format: GeoJSON
   - Source: `gis.railroads_aoi` table

5. **Clipped Transmission Lines (GeoJSON)**
   - Icon: `Zap`
   - Description: "Download transmission lines within AOI"
   - Format: GeoJSON
   - Source: `gis.transmission_lines_aoi` table

6. **Route Analytics Report (CSV)**
   - Icon: `FileText`
   - Description: "Download analytics report as CSV"
   - Format: CSV
   - Source: Parse `candidate_network.props` JSON

**Download Implementation:**
```typescript
const downloadFile = async (type: string) => {
  setDownloading(type);
  
  try {
    let data, filename, mimeType;
    
    switch (type) {
      case 'aoi-geojson':
        const { data: aoi } = await supabase
          .from('aois')
          .select('geom, name')
          .eq('project_id', projectId)
          .single();
        
        data = JSON.stringify({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: aoi.geom,
            properties: { name: aoi.name }
          }]
        }, null, 2);
        
        filename = 'aoi.geojson';
        mimeType = 'application/json';
        break;
        
      case 'route-geojson':
        const { data: route } = await supabase
          .from('candidate_network')
          .select('geom, length_m, props')
          .eq('project_id', projectId)
          .single();
        
        data = JSON.stringify({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: route.geom,
            properties: {
              length_m: route.length_m,
              ...route.props
            }
          }]
        }, null, 2);
        
        filename = 'route.geojson';
        mimeType = 'application/json';
        break;
        
      case 'route-kml':
        // Convert GeoJSON to KML (use tokml library or similar)
        // ...
        break;
        
      case 'report-csv':
        const { data: reportData } = await supabase
          .from('candidate_network')
          .select('props')
          .eq('project_id', projectId)
          .single();
        
        const csvRows = [
          ['Metric', 'Value'],
          ['Route Length (km)', reportData.props.length_km],
          ['Estimated Cost (USD)', reportData.props.cost_usd],
          ['Average Elevation (m)', reportData.props.avg_elevation_m],
          ['Railroad Crossings', reportData.props.crossings.railroads.total],
          ['Transmission Line Crossings', reportData.props.crossings.transmission_lines.total]
        ];
        
        data = csvRows.map(row => row.join(',')).join('\n');
        filename = 'route_report.csv';
        mimeType = 'text/csv';
        break;
    }
    
    // Trigger download
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success(`${filename} downloaded successfully`);
  } catch (error) {
    toast.error(`Failed to download: ${error.message}`);
  } finally {
    setDownloading(null);
  }
};
```

**Design:**
- Grid layout of download option cards (2 columns on desktop, 1 on mobile)
- Each card:
  - Large icon at top
  - Title
  - Description
  - Download button
- Loading state on button while generating file
- Completion message after successful download

---

## 🎨 Design System

### Color Palette (HSL values in index.css)

```css
:root {
  /* Primary theme colors */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}
```

### Typography
- Font family: System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", ...`)
- Headings: Bold weight (`font-bold`), clear size hierarchy
- Body text: Regular weight, 16px base
- Small text: 14px for labels, 12px for captions

### Component Styling

**Cards:**
```tsx
className="rounded-lg border bg-card text-card-foreground shadow-sm p-6"
```

**Buttons:**
```tsx
// Primary
className="bg-primary text-primary-foreground hover:bg-primary/90"

// Secondary
className="border border-input bg-background hover:bg-accent"

// Destructive
className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
```

**Inputs:**
```tsx
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Toasts:**
- Success: Green background, checkmark icon
- Error: Red background, X icon
- Info: Blue background, info icon

### Layout Principles
- Consistent spacing: 4, 8, 12, 16, 24, 32px increments
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Max-width containers for readability: `max-w-7xl mx-auto`
- Generous padding in cards: `p-6` or `p-8`

---

## 🗺️ OpenLayers Map Configuration

### Base Maps

```typescript
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";

export type BaseMapType = "osm" | "satellite" | "terrain" | "dark";

export const createBaseLayer = (type: BaseMapType, opacity: number = 1): TileLayer<any> => {
  let source;

  switch (type) {
    case "satellite":
      source = new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: "Tiles © Esri"
      });
      break;

    case "terrain":
      source = new XYZ({
        url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attributions: "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap"
      });
      break;

    case "dark":
      source = new XYZ({
        url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attributions: "© OpenStreetMap contributors © CARTO"
      });
      break;

    case "osm":
    default:
      source = new OSM();
      break;
  }

  return new TileLayer({
    source,
    opacity
  });
};
```

### Vector Layers

```typescript
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Style, Stroke, Fill, Circle } from "ol/style";

// AOI Layer
const aoiStyle = new Style({
  stroke: new Stroke({ color: 'rgba(255, 0, 0, 0.8)', width: 2 }),
  fill: new Fill({ color: 'rgba(255, 0, 0, 0.1)' })
});

const aoiLayer = new VectorLayer({
  source: new VectorSource(),
  style: aoiStyle,
  zIndex: 10
});

// Points Layer (origin/destination)
const pointsLayer = new VectorLayer({
  source: new VectorSource(),
  style: (feature) => {
    const type = feature.get('type');
    const color = type === 'origin' ? 'green' : 'red';
    
    return new Style({
      image: new Circle({
        radius: 8,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: 'white', width: 2 })
      })
    });
  },
  zIndex: 20
});

// Route Layer
const routeStyle = new Style({
  stroke: new Stroke({ color: 'rgba(0, 100, 255, 0.8)', width: 4 })
});

const routeLayer = new VectorLayer({
  source: new VectorSource(),
  style: routeStyle,
  zIndex: 15
});
```

### Map Initialization

```typescript
import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";

const map = new Map({
  target: mapRef.current,
  layers: [
    baseLayer,      // TileLayer (OSM, satellite, etc.)
    aoiLayer,       // VectorLayer for AOI polygon
    pointsLayer,    // VectorLayer for origin/destination
    routeLayer      // VectorLayer for generated route
  ],
  view: new View({
    center: fromLonLat([-98.5795, 39.8283]), // Center of USA
    zoom: 4,
    minZoom: 3,
    maxZoom: 18
  }),
  controls: defaultControls({
    zoom: true,
    rotate: false
  })
});
```

### Drawing Interactions

```typescript
import { Draw, Modify, Snap } from "ol/interaction";

// Draw polygon for AOI
const drawPolygon = new Draw({
  source: aoiSource,
  type: 'Polygon',
  style: new Style({
    stroke: new Stroke({ color: 'rgba(255, 0, 0, 0.5)', width: 2, lineDash: [10, 10] }),
    fill: new Fill({ color: 'rgba(255, 0, 0, 0.1)' })
  })
});

// Draw points for origin/destination
const drawPoint = new Draw({
  source: pointsSource,
  type: 'Point'
});

// Modify existing features
const modify = new Modify({
  source: aoiSource
});

// Snap to existing features
const snap = new Snap({
  source: aoiSource
});

// Add interactions to map
map.addInteraction(drawPolygon);
map.addInteraction(modify);
map.addInteraction(snap);
```

### Coordinate Transformations

```typescript
import { transform } from "ol/proj";

// Transform from map coordinates (EPSG:3857) to WGS84 (EPSG:4326)
const coords4326 = transform(coords3857, 'EPSG:3857', 'EPSG:4326');

// Transform from WGS84 to map coordinates
const coords3857 = transform(coords4326, 'EPSG:4326', 'EPSG:3857');
```

### GeoJSON/WKT Conversion

```typescript
import GeoJSON from "ol/format/GeoJSON";
import WKT from "ol/format/WKT";

// Read GeoJSON
const geojsonFormat = new GeoJSON();
const features = geojsonFormat.readFeatures(geojsonString, {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857'
});

// Write GeoJSON
const geojsonString = geojsonFormat.writeFeatures(features, {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857'
});

// Read WKT
const wktFormat = new WKT();
const feature = wktFormat.readFeature(wktString, {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857'
});

// Write WKT (for PostGIS)
const wktString = wktFormat.writeGeometry(geometry, {
  dataProjection: 'EPSG:4326',
  featureProjection: 'EPSG:3857'
});
```

---

## 🔧 Technical Stack Details

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "@supabase/supabase-js": "^2.58.0",
    "@tanstack/react-query": "^5.83.0",
    "ol": "^10.6.1",
    "lucide-react": "^0.462.0",
    "recharts": "^2.15.4",
    "sonner": "^1.7.4",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "@radix-ui/react-*": "latest"
  }
}
```

### File Structure

```
src/
├── components/
│   ├── dashboard/
│   │   ├── ProjectCard.tsx
│   │   └── RouteComparator.tsx
│   ├── project/
│   │   ├── StepAOI.tsx
│   │   ├── StepParameters.tsx
│   │   ├── StepPoints.tsx
│   │   ├── StepRoute.tsx
│   │   ├── StepAnalytics.tsx
│   │   └── StepDownload.tsx
│   ├── map/
│   │   └── BaseMapSelector.tsx
│   └── ui/ (shadcn components)
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── table.tsx
│       ├── tabs.tsx
│       ├── dialog.tsx
│       ├── toast.tsx
│       └── ...
├── pages/
│   ├── Index.tsx (Landing page)
│   ├── Auth.tsx (Login/Signup)
│   ├── Dashboard.tsx (Project list)
│   └── Project.tsx (6-step workflow)
├── integrations/
│   └── supabase/
│       ├── client.ts (auto-generated)
│       └── types.ts (auto-generated)
├── utils/
│   └── mapLayers.ts (Base map creation)
├── hooks/
│   ├── use-toast.ts (Toast notifications)
│   └── use-mobile.tsx (Responsive breakpoints)
├── lib/
│   └── utils.ts (cn() function for class merging)
├── index.css (Global styles + design tokens)
└── main.tsx (App entry point)
```

---

## 🚀 Implementation Roadmap

### ✅ Phase 1: Foundation (COMPLETED in current project)
- Authentication system with Supabase
- User profiles table
- Dashboard with project cards
- Project CRUD operations
- Complete database schema (all tables created)

### ✅ Phase 2: GIS Workflow (COMPLETED)
- Step 1: AOI drawing with OpenLayers
- Step 2: Parameter configuration table
- Step 3: Origin/destination point placement
- Step 4: Route generation (mock implementation)
- Step 5: Analytics dashboard (mock data)
- Step 6: Download functionality

### ⏳ Phase 3: Real Integrations (NEXT STEPS)
- Upload actual railroad and transmission line shapefiles to `gis.railroads` and `gis.transmission_lines`
- Upload land cover raster (`landcover_720.tif`) to Supabase Storage
- Implement real `gis.clip_project_layers()` functionality
- Replace mock route generation with actual optimization algorithm
- Generate real analytics from route geometry intersections

### ⏳ Phase 4: Advanced Features (FUTURE)
- Multi-route comparison view
- Route editing/refinement tools
- Export to PDF reports with maps
- Project sharing/collaboration features
- Advanced 3D terrain visualization
- Integration with external routing engines

---

## 🎯 Key Implementation Guidelines

### 1. Coordinate System Management
- **Storage:** ALL geometries stored in **EPSG:4326** (WGS84)
- **Display:** Maps use **EPSG:3857** (Web Mercator)
- **Always transform** between systems when reading/writing to database

### 2. RLS Security
- **Every GIS table** has RLS enabled
- Users can only access their own project data
- Policies check `owner_id` or `project_members` table

### 3. Sequential Workflow Enforcement
- `projects.current_step` field controls progression (1-6)
- Tabs are visually disabled until previous step complete
- Each step component calls `onComplete()` which updates `current_step`

### 4. Map State Management
- Use `useRef` for OpenLayers map instance (prevent re-renders)
- Separate refs for layers, sources, interactions
- **Always clean up** map on component unmount:
```typescript
useEffect(() => {
  return () => {
    if (mapInstance.current) {
      mapInstance.current.setTarget(undefined);
    }
  };
}, []);
```

### 5. Data Loading Pattern
```typescript
useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('project_id', projectId)
      .single(); // or .maybeSingle() if row might not exist
    
    if (error) {
      toast.error(error.message);
    } else {
      setData(data);
    }
    
    setLoading(false);
  };
  
  loadData();
}, [projectId]);
```

### 6. Toast Notification Standards
- **Success:** Green, checkmark icon, 3s duration
- **Error:** Red, X icon, 5s duration
- **Info:** Blue, info icon, 3s duration
- Use `sonner` library via shadcn toast

### 7. Loading States
- Show spinner on buttons during async operations
- Disable form inputs while saving
- Display skeleton loaders for cards while fetching

### 8. Error Handling
```typescript
try {
  const { data, error } = await supabase...;
  
  if (error) throw error;
  
  // Success path
  toast.success('Operation successful');
} catch (error) {
  console.error('Error:', error);
  toast.error(error.message || 'An unexpected error occurred');
}
```

---

## 🎨 UI/UX Improvements Implemented

### Dashboard
- Modern card-based layout with hover effects
- Clear visual hierarchy
- Responsive grid (1/2/3 columns)
- Empty state with helpful message
- Quick actions on cards (archive, delete)

### Project Workflow
- Clean tab navigation with progress indicator
- Locked tabs with visual feedback
- Consistent card-based step layout
- Smooth transitions between steps

### Maps
- Floating base map selector panel
- Opacity control for base layers
- Clear drawing tool buttons
- Visual feedback during drawing
- Zoom controls always visible
- Layer toggles for overlays

### Forms
- Clear labels and placeholders
- Inline validation messages
- Loading states on submit buttons
- Success/error feedback via toasts

### General
- Consistent spacing (Tailwind scale)
- Rounded corners throughout (`rounded-lg`)
- Subtle shadows for depth (`shadow-sm`, `shadow-md`)
- Smooth transitions (`transition-all duration-200`)
- Accessible color contrast (WCAG AA)

---

## 📝 Environment Setup Instructions

### 1. Supabase Project Setup

**Create Supabase Project:**
1. Go to https://supabase.com/dashboard
2. Create new project
3. Wait for provisioning (~2 minutes)

**Enable PostGIS Extension:**
```sql
create extension if not exists postgis;
```

**Run All Table Creation Scripts:**
- Execute all SQL from "Schema: `public`" section
- Execute all SQL from "Schema: `gis`" section
- Execute all RPC function definitions

**Configure Authentication:**
1. Navigate to Authentication → Providers
2. Enable **Email** provider
3. **Disable "Confirm Email"** (for development)
4. Set redirect URLs:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: `http://localhost:5173/**`

**Create Storage Bucket:**
```sql
insert into storage.buckets (id, name, public)
values ('BaseData', 'BaseData', false);
```

**Apply Storage Policies:**
Run all storage policy SQL from Storage section.

### 2. Frontend Configuration

**Environment Variables (.env):**
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Get Credentials:**
- Project URL: Settings → API → Project URL
- Anon Key: Settings → API → anon public key

### 3. Optional: Upload Reference Datasets

**Upload Shapefiles to `gis.railroads` and `gis.transmission_lines`:**
Use QGIS or similar tool:
1. Connect to Supabase PostgreSQL
2. Import shapefiles to `gis` schema
3. Ensure SRID = 4326

**Upload Land Cover Raster:**
1. Navigate to Storage in Supabase Dashboard
2. Upload `landcover_720.tif` to `BaseData/baseRasters/720/`

---

## 🔒 Security Best Practices

1. ✅ **Never expose `service_role` key** in frontend code
2. ✅ **Always use RLS** on all user-facing tables
3. ✅ **Validate user ownership** before any database operation
4. ✅ **Sanitize GeoJSON input** before storing
5. ✅ **Use parameterized queries** via Supabase client (prevents SQL injection)
6. ✅ **Implement rate limiting** on expensive operations (route generation)
7. ✅ **Validate geometry types** before saving to PostGIS
8. ✅ **Use HTTPS** for all API requests
9. ✅ **Enable CORS** only for trusted domains in production
10. ✅ **Store sensitive data** (API keys) in Supabase Vault or environment variables

---

## ✅ Testing Checklist

### Authentication
- [ ] User can sign up with all profile fields
- [ ] User can log in with email/password
- [ ] Session persists after page refresh
- [ ] User can log out successfully
- [ ] Protected routes redirect to `/auth` when not logged in

### Dashboard
- [ ] Projects display correctly in cards
- [ ] Can create new project
- [ ] Can open existing project
- [ ] Can archive/unarchive project
- [ ] Can delete project (with confirmation)
- [ ] Empty state shows when no projects exist

### Step 1: AOI
- [ ] Map loads correctly
- [ ] Can draw polygon
- [ ] Can clear/delete polygon
- [ ] Base map selector works for all types
- [ ] Opacity slider adjusts base layer
- [ ] Save button stores geometry to database
- [ ] Advances to step 2 after successful save

### Step 2: Parameters
- [ ] Table displays all parameter rows
- [ ] Can edit weight values (0-1 range)
- [ ] Can toggle enabled/disabled checkboxes
- [ ] Save stores parameters correctly
- [ ] Loads existing parameters on page load
- [ ] Advances to step 3 after save

### Step 3: Points
- [ ] AOI polygon displays on map
- [ ] Can add origin point by clicking map
- [ ] Can add destination point
- [ ] Can update/move existing points
- [ ] Points stored correctly in database
- [ ] Advances to step 4 when both points placed

### Step 4: Route
- [ ] AOI and points display correctly
- [ ] Generate route button works
- [ ] Route displays as blue line on map
- [ ] Route stored with length and cost metadata
- [ ] Advances to step 5 after generation

### Step 5: Analytics
- [ ] Metric cards display correctly
- [ ] Charts render properly
- [ ] Data loads from route metadata
- [ ] Complete button advances to step 6

### Step 6: Download
- [ ] All download options display
- [ ] GeoJSON downloads work for AOI and route
- [ ] KML download works
- [ ] CSV report downloads correctly
- [ ] Downloaded files contain correct data

---

## 🎉 Project Success Criteria

A fully successful implementation will demonstrate:

1. ✅ **Complete authentication flow** with user profiles
2. ✅ **Functional 6-step workflow** with sequential unlocking
3. ✅ **All database tables** created with proper RLS policies
4. ✅ **Maps rendering** with OpenLayers and multiple base layers
5. ✅ **Geometry storage** in PostGIS format (WKT/GeoJSON)
6. ✅ **Download functionality** for all advertised formats
7. ✅ **Clean, professional UI** following design system
8. ✅ **Mobile-responsive** layouts
9. ✅ **Comprehensive error handling** and user feedback
10. ✅ **Smooth navigation** and state management

---

## 📚 Additional Resources

### OpenLayers
- [Official Documentation](https://openlayers.org/en/latest/apidoc/)
- [Geometry Types](https://openlayers.org/en/latest/apidoc/module-ol_geom.html)
- [Interactions](https://openlayers.org/en/latest/apidoc/module-ol_interaction.html)
- [Formats](https://openlayers.org/en/latest/apidoc/module-ol_format.html)

### Supabase
- [PostGIS Guide](https://supabase.com/docs/guides/database/extensions/postgis)
- [Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage API](https://supabase.com/docs/guides/storage)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

### shadcn/ui
- [Component Documentation](https://ui.shadcn.com/docs)
- [Theming Guide](https://ui.shadcn.com/docs/theming)
- [Installation](https://ui.shadcn.com/docs/installation)

---

## 💡 Development Tips

### Starting Fresh
1. Set up Supabase project first (database + auth)
2. Test authentication flow before GIS features
3. Implement steps sequentially (1 → 2 → 3 → etc.)
4. Use mock data initially, integrate real datasets later

### Testing Strategy
- Test each step individually before moving to next
- Verify RLS policies by testing with different users
- Test coordinate transformations thoroughly
- Check mobile responsiveness on each page

### Debugging
- Use browser DevTools for network requests
- Check Supabase logs for database errors
- Use `console.log` for OpenLayers feature debugging
- Test geometry validity with PostGIS `ST_IsValid()`

### Performance
- Lazy load map components
- Use React Query for data caching
- Implement pagination for large project lists
- Optimize vector layer rendering (simplify geometries if needed)

---

**Remember:** This is a professional infrastructure planning tool. Prioritize **data accuracy**, **security**, and **user experience** in all implementation decisions.

---

**END OF COMPLETE PROJECT SPECIFICATION**
