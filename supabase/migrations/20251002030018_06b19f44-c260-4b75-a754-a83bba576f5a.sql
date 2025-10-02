-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create gis schema for global reference data
CREATE SCHEMA IF NOT EXISTS gis;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_name TEXT,
  job_title TEXT,
  email TEXT NOT NULL,
  phone_number TEXT,
  company_website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Create AOI polygons table
CREATE TABLE public.aoi_polygons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  geom GEOMETRY(POLYGON, 4326) NOT NULL,
  geojson JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_aoi_polygons_geom ON public.aoi_polygons USING GIST(geom);

-- Enable RLS on aoi_polygons
ALTER TABLE public.aoi_polygons ENABLE ROW LEVEL SECURITY;

-- AOI policies
CREATE POLICY "Users can view own AOI"
  ON public.aoi_polygons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = aoi_polygons.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own AOI"
  ON public.aoi_polygons FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = aoi_polygons.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own AOI"
  ON public.aoi_polygons FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = aoi_polygons.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Create routing parameters table
CREATE TABLE public.routing_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on routing_parameters
ALTER TABLE public.routing_parameters ENABLE ROW LEVEL SECURITY;

-- Routing parameters policies
CREATE POLICY "Users can view own routing parameters"
  ON public.routing_parameters FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = routing_parameters.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own routing parameters"
  ON public.routing_parameters FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = routing_parameters.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own routing parameters"
  ON public.routing_parameters FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = routing_parameters.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Create origin/destination points table
CREATE TABLE public.route_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  point_type TEXT NOT NULL CHECK (point_type IN ('origin', 'destination')),
  geom GEOMETRY(POINT, 4326) NOT NULL,
  geojson JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_route_points_geom ON public.route_points USING GIST(geom);

-- Enable RLS on route_points
ALTER TABLE public.route_points ENABLE ROW LEVEL SECURITY;

-- Route points policies
CREATE POLICY "Users can view own route points"
  ON public.route_points FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = route_points.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own route points"
  ON public.route_points FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = route_points.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own route points"
  ON public.route_points FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = route_points.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Create routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL UNIQUE,
  geom GEOMETRY(LINESTRING, 4326) NOT NULL,
  geojson JSONB NOT NULL,
  length_km NUMERIC,
  cost NUMERIC,
  analytics JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_routes_geom ON public.routes USING GIST(geom);

-- Enable RLS on routes
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Routes policies
CREATE POLICY "Users can view own routes"
  ON public.routes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = routes.project_id 
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own routes"
  ON public.routes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = routes.project_id 
    AND projects.user_id = auth.uid()
  ));

-- Global reference data tables in gis schema
-- Railroads table
CREATE TABLE gis.railroads (
  objectid SERIAL PRIMARY KEY,
  trkclass INTEGER,
  geom GEOMETRY(MULTILINESTRING, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_railroads_geom ON gis.railroads USING GIST(geom);

-- Transmission lines table
CREATE TABLE gis.transmissionlines4326 (
  id TEXT PRIMARY KEY,
  voltage NUMERIC,
  geom GEOMETRY(MULTILINESTRING, 4326) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transmissionlines_geom ON gis.transmissionlines4326 USING GIST(geom);

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    email
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_aoi_polygons_updated_at
  BEFORE UPDATE ON public.aoi_polygons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_routing_parameters_updated_at
  BEFORE UPDATE ON public.routing_parameters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();