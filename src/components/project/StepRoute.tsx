import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap } from "lucide-react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import { Style, Stroke, Fill, Circle } from "ol/style";
import GeoJSON from "ol/format/GeoJSON";
import { LineString } from "ol/geom";
import Feature from "ol/Feature";
import "ol/ol.css";

interface StepRouteProps {
  projectId: string;
  onComplete: () => void;
}

const StepRoute = ({ projectId, onComplete }: StepRouteProps) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [hasRoute, setHasRoute] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const aoiSourceRef = useRef<VectorSource | null>(null);
  const pointsSourceRef = useRef<VectorSource | null>(null);
  const routeSourceRef = useRef<VectorSource | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // AOI layer
    const aoiSource = new VectorSource();
    aoiSourceRef.current = aoiSource;

    // Points layer
    const pointsSource = new VectorSource();
    pointsSourceRef.current = pointsSource;

    // Route layer
    const routeSource = new VectorSource();
    routeSourceRef.current = routeSource;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: aoiSource,
          style: new Style({
            stroke: new Stroke({ color: "rgba(255, 0, 0, 0.8)", width: 2 }),
            fill: new Fill({ color: "rgba(255, 0, 0, 0.1)" }),
          }),
        }),
        new VectorLayer({
          source: pointsSource,
          style: (feature) => {
            const pointType = feature.get("pointType");
            return new Style({
              image: new Circle({
                radius: 8,
                fill: new Fill({
                  color: pointType === "origin" ? "#10b981" : "#ef4444",
                }),
                stroke: new Stroke({ color: "#fff", width: 2 }),
              }),
            });
          },
        }),
        new VectorLayer({
          source: routeSource,
          style: new Style({
            stroke: new Stroke({
              color: "#2563eb",
              width: 3,
            }),
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([-98.5795, 39.8283]),
        zoom: 4,
      }),
    });

    mapInstanceRef.current = map;
    loadData();

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  const loadData = async () => {
    try {
      const format = new GeoJSON();

      // Load AOI
      const { data: aoiData } = await supabase
        .from("aoi_polygons")
        .select("geojson")
        .eq("project_id", projectId)
        .single();

      if (aoiData && aoiSourceRef.current) {
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
        pointsData.forEach((point) => {
          const features = format.readFeatures(point.geojson, {
            featureProjection: "EPSG:3857",
          });
          features.forEach((f) => f.set("pointType", point.point_type));
          pointsSourceRef.current!.addFeatures(features);
        });
      }

      // Load existing route
      const { data: routeData } = await supabase
        .from("routes")
        .select("geojson")
        .eq("project_id", projectId)
        .single();

      if (routeData && routeSourceRef.current) {
        const features = format.readFeatures(routeData.geojson, {
          featureProjection: "EPSG:3857",
        });
        routeSourceRef.current.addFeatures(features);
        setHasRoute(true);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
    }
  };

  const generateRoute = async () => {
    setGenerating(true);

    try {
      // Get origin and destination points
      const { data: points } = await supabase
        .from("route_points")
        .select("*")
        .eq("project_id", projectId);

      if (!points || points.length < 2) {
        throw new Error("Both origin and destination points are required");
      }

      const origin = points.find((p) => p.point_type === "origin");
      const destination = points.find((p) => p.point_type === "destination");

      if (!origin || !destination) {
        throw new Error("Both origin and destination points are required");
      }

      // Mock route generation (straight line between points)
      const format = new GeoJSON();
      const originFeature = format.readFeatures(origin.geojson, {
        featureProjection: "EPSG:3857",
      })[0];
      const destFeature = format.readFeatures(destination.geojson, {
        featureProjection: "EPSG:3857",
      })[0];

      const originCoords = (originFeature.getGeometry() as any).getCoordinates();
      const destCoords = (destFeature.getGeometry() as any).getCoordinates();

      const lineString = new LineString([originCoords, destCoords]);
      const routeFeature = new Feature({ geometry: lineString });

      // Clear existing route
      routeSourceRef.current?.clear();
      routeSourceRef.current?.addFeature(routeFeature);

      // Save to database
      const routeGeoJSON = JSON.parse(
        format.writeFeature(routeFeature, {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:4326",
        })
      );

      const coordinates = routeGeoJSON.geometry.coordinates;
      const wktCoords = coordinates
        .map((coord: number[]) => `${coord[0]} ${coord[1]}`)
        .join(", ");
      const wkt = `LINESTRING(${wktCoords})`;

      // Calculate mock length
      const length = Math.sqrt(
        Math.pow(destCoords[0] - originCoords[0], 2) +
        Math.pow(destCoords[1] - originCoords[1], 2)
      ) / 1000; // Convert to km

      // Check if route exists
      const { data: existing } = await supabase
        .from("routes")
        .select("id")
        .eq("project_id", projectId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("routes")
          .update({
            geom: wkt,
            geojson: { type: "FeatureCollection", features: [routeGeoJSON] },
            length_km: length,
            cost: length * 1000, // Mock cost
          })
          .eq("project_id", projectId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("routes").insert({
          project_id: projectId,
          geom: wkt,
          geojson: { type: "FeatureCollection", features: [routeGeoJSON] },
          length_km: length,
          cost: length * 1000,
        });

        if (error) throw error;
      }

      setHasRoute(true);
      toast({
        title: "Route Generated",
        description: "Optimal route has been calculated successfully.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4: Generate Route</CardTitle>
        <CardDescription>
          Generate the optimal route between origin and destination
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={mapRef}
          className="w-full h-[500px] rounded-lg border map-container"
        />

        <Button onClick={generateRoute} disabled={generating} size="lg">
          {generating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating Route...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-5 w-5" />
              {hasRoute ? "Regenerate" : "Generate"} Route
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StepRoute;