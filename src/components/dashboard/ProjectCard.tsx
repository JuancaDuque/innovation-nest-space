import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Archive, MapPin, Route } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Style, Stroke, Circle, Fill } from "ol/style";
import "ol/ol.css";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  current_step: number;
  created_at: string;
  user_id: string;
}

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  isArchived?: boolean;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, projectId: string) => void;
}

const ProjectCard = ({ 
  project, 
  onOpen, 
  onArchive, 
  isArchived = false,
  isDraggable = false,
  onDragStart 
}: ProjectCardProps) => {
  const stepLabels = ["AOI", "Parameters", "Points", "Route", "Analytics", "Download"];
  const currentStepLabel = stepLabels[project.current_step - 1] || "Not Started";
  const progress = (project.current_step / 6) * 100;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [hasRoute, setHasRoute] = useState(false);

  useEffect(() => {
    const loadRoutePreview = async () => {
      if (project.current_step < 4 || !mapRef.current) return;

      try {
        // Check if route exists for this project
        const { data: routeData, error } = await supabase
          .from("routes")
          .select("geojson")
          .eq("project_id", project.id)
          .single();

        if (error || !routeData) {
          setHasRoute(false);
          return;
        }

        setHasRoute(true);

        // Create miniature map
        const routeSource = new VectorSource({
          features: new GeoJSON().readFeatures(routeData.geojson, {
            featureProjection: "EPSG:3857",
          }),
        });

        const routeLayer = new VectorLayer({
          source: routeSource,
          style: new Style({
            stroke: new Stroke({
              color: "hsl(220 70% 50%)",
              width: 3,
            }),
            image: new Circle({
              radius: 5,
              fill: new Fill({ color: "hsl(220 70% 50%)" }),
            }),
          }),
        });

        const map = new Map({
          target: mapRef.current,
          layers: [
            new TileLayer({
              source: new OSM(),
            }),
            routeLayer,
          ],
          view: new View({
            center: [0, 0],
            zoom: 2,
          }),
          controls: [],
          interactions: [],
        });

        // Fit to route extent
        const extent = routeSource.getExtent();
        map.getView().fit(extent, {
          padding: [20, 20, 20, 20],
          duration: 0,
        });

        mapInstanceRef.current = map;
      } catch (error) {
        console.error("Error loading route preview:", error);
        setHasRoute(false);
      }
    };

    loadRoutePreview();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(undefined);
        mapInstanceRef.current = null;
      }
    };
  }, [project.id, project.current_step]);

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] ${
        isArchived ? "opacity-70" : ""
      } ${isDraggable ? "cursor-move" : ""}`}
      style={{ boxShadow: "var(--shadow-card)" }}
      draggable={isDraggable}
      onDragStart={(e) => onDragStart?.(e, project.id)}
    >
      {/* Gradient accent border */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Route miniature or placeholder */}
      <div className="h-32 relative overflow-hidden border-b">
        {hasRoute && project.current_step >= 4 ? (
          <div ref={mapRef} className="absolute inset-0 w-full h-full" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-muted/30">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <MapPin className="h-8 w-8 text-primary/40 absolute -left-6 -top-2" />
                <Route className="h-10 w-10 text-accent/40" />
                <MapPin className="h-8 w-8 text-destructive/40 absolute -right-6 -bottom-2" />
              </div>
            </div>
          </div>
        )}
        {/* Progress indicator overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/80 backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {currentStepLabel}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2 text-sm">
          {project.description || "No description provided"}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative space-y-3 pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress: {project.current_step}/6</span>
          <span>{format(new Date(project.created_at), "MMM d, yyyy")}</span>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => onOpen(project.id)}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            {isArchived ? "View" : "Open"}
          </Button>
          {!isArchived && onArchive && (
            <Button
              onClick={() => onArchive(project.id)}
              variant="outline"
              size="icon"
              className="shrink-0"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
