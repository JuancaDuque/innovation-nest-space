import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Draw from "ol/interaction/Draw";
import { fromLonLat, toLonLat } from "ol/proj";
import { Style, Stroke, Fill } from "ol/style";
import GeoJSON from "ol/format/GeoJSON";
import BaseMapSelector, { BaseMapType } from "@/components/map/BaseMapSelector";
import { createBaseLayer } from "@/utils/mapLayers";
import "ol/ol.css";

interface StepAOIProps {
  projectId: string;
  onComplete: () => void;
}

const StepAOI = ({ projectId, onComplete }: StepAOIProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [hasAOI, setHasAOI] = useState(false);
  const [baseMapType, setBaseMapType] = useState<BaseMapType>("osm");
  const [baseMapOpacity, setBaseMapOpacity] = useState(1);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const baseLayerRef = useRef<any>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const drawInteractionRef = useRef<Draw | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Create base layer
    const baseLayer = createBaseLayer(baseMapType, baseMapOpacity);
    baseLayerRef.current = baseLayer;

    // Create vector source for AOI
    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
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

    // Initialize map
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, vectorLayer],
      view: new View({
        center: fromLonLat([-98.5795, 39.8283]), // Center of USA
        zoom: 4,
      }),
    });

    mapInstanceRef.current = map;

    // Load existing AOI if any
    loadExistingAOI();

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  useEffect(() => {
    // Update base layer when type or opacity changes
    if (mapInstanceRef.current && baseLayerRef.current) {
      const newBaseLayer = createBaseLayer(baseMapType, baseMapOpacity);
      mapInstanceRef.current.getLayers().setAt(0, newBaseLayer);
      baseLayerRef.current = newBaseLayer;
    }
  }, [baseMapType, baseMapOpacity]);

  const loadExistingAOI = async () => {
    try {
      const { data, error } = await supabase
        .from("aoi_polygons")
        .select("geojson")
        .eq("project_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data && vectorSourceRef.current) {
        const format = new GeoJSON();
        const features = format.readFeatures(data.geojson, {
          featureProjection: "EPSG:3857",
        });
        vectorSourceRef.current.addFeatures(features);
        setHasAOI(true);

        // Fit map to AOI extent
        const extent = vectorSourceRef.current.getExtent();
        mapInstanceRef.current?.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 12,
        });
      }
    } catch (error: any) {
      console.error("Error loading AOI:", error);
    }
  };

  const enableDrawing = () => {
    if (!mapInstanceRef.current || !vectorSourceRef.current) return;

    // Clear existing features
    vectorSourceRef.current.clear();
    setHasAOI(false);

    // Remove old draw interaction if exists
    if (drawInteractionRef.current) {
      mapInstanceRef.current.removeInteraction(drawInteractionRef.current);
    }

    // Add draw interaction
    const draw = new Draw({
      source: vectorSourceRef.current,
      type: "Polygon",
    });

    draw.on("drawend", () => {
      mapInstanceRef.current?.removeInteraction(draw);
      setHasAOI(true);
    });

    mapInstanceRef.current.addInteraction(draw);
    drawInteractionRef.current = draw;

    toast({
      title: "Draw AOI",
      description: "Click on the map to draw your area of interest polygon.",
    });
  };

  const handleSave = async () => {
    if (!vectorSourceRef.current || !hasAOI) return;

    setSaving(true);

    try {
      const features = vectorSourceRef.current.getFeatures();
      if (features.length === 0) {
        throw new Error("No AOI polygon drawn");
      }

      const format = new GeoJSON();
      const geojson = JSON.parse(
        format.writeFeatures(features, {
          featureProjection: "EPSG:3857",
          dataProjection: "EPSG:4326",
        })
      );

      // Get the first feature's geometry
      const geometry = geojson.features[0].geometry;

      // Convert to WKT for PostGIS
      const coordinates = geometry.coordinates[0];
      const wktCoords = coordinates
        .map((coord: number[]) => `${coord[0]} ${coord[1]}`)
        .join(", ");
      const wkt = `POLYGON((${wktCoords}))`;

      // Check if AOI exists
      const { data: existing } = await supabase
        .from("aoi_polygons")
        .select("id")
        .eq("project_id", projectId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("aoi_polygons")
          .update({
            geom: wkt,
            geojson: geojson,
          })
          .eq("project_id", projectId);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("aoi_polygons")
          .insert({
            project_id: projectId,
            geom: wkt,
            geojson: geojson,
          });

        if (error) throw error;
      }

      toast({
        title: "AOI Saved",
        description: "Your area of interest has been saved successfully.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Define Area of Interest (AOI)</CardTitle>
        <CardDescription>
          Draw a polygon on the map to define your project's area of interest
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <BaseMapSelector
          value={baseMapType}
          onChange={setBaseMapType}
          opacity={baseMapOpacity}
          onOpacityChange={setBaseMapOpacity}
        />

        <div
          ref={mapRef}
          className="w-full h-[500px] rounded-lg border map-container"
        />
        
        <div className="flex gap-2">
          <Button onClick={enableDrawing} variant="outline">
            {hasAOI ? "Redraw" : "Draw"} AOI
          </Button>
          <Button onClick={handleSave} disabled={!hasAOI || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save AOI
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StepAOI;