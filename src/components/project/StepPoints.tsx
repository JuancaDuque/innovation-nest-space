import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Navigation } from "lucide-react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import { fromLonLat } from "ol/proj";
import { Style, Circle, Fill, Stroke } from "ol/style";
import GeoJSON from "ol/format/GeoJSON";
import "ol/ol.css";

interface StepPointsProps {
  projectId: string;
  onComplete: () => void;
}

const StepPoints = ({ projectId, onComplete }: StepPointsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"origin" | "destination" | null>(null);
  const [hasOrigin, setHasOrigin] = useState(false);
  const [hasDestination, setHasDestination] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const aoiSourceRef = useRef<VectorSource | null>(null);
  const pointsSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // AOI layer
    const aoiSource = new VectorSource();
    aoiSourceRef.current = aoiSource;

    const aoiLayer = new VectorLayer({
      source: aoiSource,
      style: new Style({
        stroke: new Stroke({
          color: "rgba(255, 0, 0, 0.8)",
          width: 2,
        }),
        fill: new Fill({
          color: "rgba(255, 0, 0, 0.1)",
        }),
      }),
    });

    // Points layer
    const pointsSource = new VectorSource();
    pointsSourceRef.current = pointsSource;

    const pointsLayer = new VectorLayer({
      source: pointsSource,
      style: (feature) => {
        const pointType = feature.get("pointType");
        return new Style({
          image: new Circle({
            radius: 8,
            fill: new Fill({
              color: pointType === "origin" ? "#10b981" : "#ef4444",
            }),
            stroke: new Stroke({
              color: "#fff",
              width: 2,
            }),
          }),
        });
      },
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        aoiLayer,
        pointsLayer,
      ],
      view: new View({
        center: fromLonLat([-98.5795, 39.8283]),
        zoom: 4,
      }),
    });

    mapInstanceRef.current = map;

    loadAOIAndPoints();

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  const loadAOIAndPoints = async () => {
    try {
      // Load AOI
      const { data: aoiData } = await supabase
        .from("aoi_polygons")
        .select("geojson")
        .eq("project_id", projectId)
        .single();

      if (aoiData && aoiSourceRef.current) {
        const format = new GeoJSON();
        const features = format.readFeatures(aoiData.geojson, {
          featureProjection: "EPSG:3857",
        });
        aoiSourceRef.current.addFeatures(features);

        const extent = aoiSourceRef.current.getExtent();
        mapInstanceRef.current?.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 12,
        });
      }

      // Load points
      const { data: pointsData } = await supabase
        .from("route_points")
        .select("*")
        .eq("project_id", projectId);

      if (pointsData && pointsSourceRef.current) {
        const format = new GeoJSON();
        pointsData.forEach((point) => {
          const features = format.readFeatures(point.geojson, {
            featureProjection: "EPSG:3857",
          });
          features.forEach((f) => f.set("pointType", point.point_type));
          pointsSourceRef.current!.addFeatures(features);
          
          if (point.point_type === "origin") setHasOrigin(true);
          if (point.point_type === "destination") setHasDestination(true);
        });
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
    }
  };

  const enableDrawing = (pointType: "origin" | "destination") => {
    if (!mapInstanceRef.current || !pointsSourceRef.current) return;

    // Remove old draw interaction
    if (drawInteractionRef.current) {
      mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
    }

    // Remove existing point of this type
    const features = pointsSourceRef.current.getFeatures();
    features.forEach((f) => {
      if (f.get("pointType") === pointType) {
        pointsSourceRef.current!.removeFeature(f);
      }
    });

    setMode(pointType);

    const draw = new Draw({
      source: pointsSourceRef.current,
      type: "Point",
    });

    draw.on("drawend", async (e) => {
      e.feature.set("pointType", pointType);
      mapInstanceRef.current?.removeInteraction(draw);
      setMode(null);
      
      await savePoint(e.feature, pointType);
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;
  };

  const savePoint = async (feature: any, pointType: "origin" | "destination") => {
    setLoading(true);

    try {
      const format = new GeoJSON();
      const geojson = JSON.parse(
        format.writeFeature(feature, {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:4326",
        })
      );

      const coordinates = geojson.geometry.coordinates;
      const wkt = `POINT(${coordinates[0]} ${coordinates[1]})`;

      // Delete existing point of this type
      await supabase
        .from("route_points")
        .delete()
        .eq("project_id", projectId)
        .eq("point_type", pointType);

      // Insert new point
      const { error } = await supabase
        .from("route_points")
        .insert({
          project_id: projectId,
          point_type: pointType,
          geom: wkt,
          geojson: { type: "FeatureCollection", features: [geojson] },
        });

      if (error) throw error;

      if (pointType === "origin") setHasOrigin(true);
      if (pointType === "destination") setHasDestination(true);

      toast({
        title: `${pointType === "origin" ? "Origin" : "Destination"} Point Added`,
        description: "Point has been saved successfully.",
      });

      if (hasOrigin && hasDestination || (pointType === "origin" && hasDestination) || (pointType === "destination" && hasOrigin)) {
        onComplete();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Select Origin & Destination Points</CardTitle>
        <CardDescription>
          Click on the map to place origin (green) and destination (red) points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={mapRef}
          className="w-full h-[500px] rounded-lg border map-container"
        />
        
        <div className="flex gap-2">
          <Button
            onClick={() => enableDrawing("origin")}
            disabled={loading || mode !== null}
            variant={hasOrigin ? "outline" : "default"}
          >
            <MapPin className="mr-2 h-4 w-4 text-green-600" />
            {hasOrigin ? "Update" : "Add"} Origin
          </Button>
          <Button
            onClick={() => enableDrawing("destination")}
            disabled={loading || mode !== null}
            variant={hasDestination ? "outline" : "default"}
          >
            <Navigation className="mr-2 h-4 w-4 text-red-600" />
            {hasDestination ? "Update" : "Add"} Destination
          </Button>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {mode && (
          <p className="text-sm text-muted-foreground">
            Click on the map to place the {mode} point
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StepPoints;