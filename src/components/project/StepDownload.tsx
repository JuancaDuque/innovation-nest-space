import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, FileJson, FileText, MapIcon } from "lucide-react";

interface StepDownloadProps {
  projectId: string;
}

const StepDownload = ({ projectId }: StepDownloadProps) => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadFile = async (type: string) => {
    setDownloading(type);

    try {
      let data: any;
      let filename: string;
      let content: string;

      switch (type) {
        case "aoi-geojson":
          const { data: aoiData } = await supabase
            .from("aoi_polygons")
            .select("geojson")
            .eq("project_id", projectId)
            .single();
          
          data = aoiData?.geojson;
          filename = "aoi_polygon.geojson";
          content = JSON.stringify(data, null, 2);
          break;

        case "route-geojson":
          const { data: routeData } = await supabase
            .from("routes")
            .select("geojson")
            .eq("project_id", projectId)
            .single();
          
          data = routeData?.geojson;
          filename = "route.geojson";
          content = JSON.stringify(data, null, 2);
          break;

        case "route-kml":
          const { data: routeKmlData } = await supabase
            .from("routes")
            .select("geojson")
            .eq("project_id", projectId)
            .single();
          
          // Simple KML conversion (mock)
          const geojsonData = routeKmlData?.geojson as any;
          const coordinates = geojsonData?.features?.[0]?.geometry?.coordinates || [];
          const kmlCoords = coordinates.map((c: number[]) => `${c[0]},${c[1]},0`).join("\n");
          
          filename = "route.kml";
          content = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Routify Route</name>
    <Placemark>
      <name>Generated Route</name>
      <LineString>
        <coordinates>
          ${kmlCoords}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
          break;

        case "report-csv":
          const { data: reportData } = await supabase
            .from("routes")
            .select("*")
            .eq("project_id", projectId)
            .single();
          
          filename = "route_report.csv";
          content = `Parameter,Value\nRoute Length (km),${reportData?.length_km || "N/A"}\nEstimated Cost,$${reportData?.cost || "N/A"}\nProject ID,${projectId}`;
          break;

        default:
          throw new Error("Unknown download type");
      }

      // Create and trigger download
      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const downloadOptions = [
    {
      id: "aoi-geojson",
      title: "AOI Polygon (GeoJSON)",
      description: "Download the area of interest boundary",
      icon: MapIcon,
    },
    {
      id: "route-geojson",
      title: "Route (GeoJSON)",
      description: "Download the generated route in GeoJSON format",
      icon: FileJson,
    },
    {
      id: "route-kml",
      title: "Route (KML)",
      description: "Download the generated route in KML format",
      icon: MapIcon,
    },
    {
      id: "report-csv",
      title: "Route Report (CSV)",
      description: "Download route statistics and analytics",
      icon: FileText,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 6: Download Results</CardTitle>
        <CardDescription>
          Export your project data and results in various formats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {downloadOptions.map((option) => (
            <Card key={option.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <option.icon className="h-5 w-5 text-primary" />
                  {option.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => downloadFile(option.id)}
                  disabled={downloading === option.id}
                  className="w-full"
                >
                  {downloading === option.id ? (
                    "Downloading..."
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StepDownload;