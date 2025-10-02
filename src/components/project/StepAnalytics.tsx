import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Route as RouteIcon, Mountain } from "lucide-react";

interface StepAnalyticsProps {
  projectId: string;
  onComplete: () => void;
}

const StepAnalytics = ({ projectId, onComplete }: StepAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState<any>(null);

  useEffect(() => {
    loadRouteData();
    onComplete(); // Analytics step is automatically complete
  }, []);

  const loadRouteData = async () => {
    try {
      const { data } = await supabase
        .from("routes")
        .select("*")
        .eq("project_id", projectId)
        .single();

      setRouteData(data);
    } catch (error) {
      console.error("Error loading route:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const mockAnalytics = {
    landCover: [
      { type: "Developed", percentage: 15 },
      { type: "Forest", percentage: 45 },
      { type: "Cropland", percentage: 30 },
      { type: "Wetlands", percentage: 10 },
    ],
    crossings: {
      railroads: 3,
      transmissionLines: 7,
      pipelines: 2,
    },
    elevation: {
      min: 150,
      max: 850,
      avg: 420,
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 5: Route Analytics</CardTitle>
        <CardDescription>
          Detailed analysis and statistics of your generated route
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Route Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-primary" />
                Route Length
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {routeData?.length_km?.toFixed(2) || "N/A"} km
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${routeData?.cost?.toLocaleString() || "N/A"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Mountain className="h-4 w-4 text-primary" />
                Avg Elevation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockAnalytics.elevation.avg} m
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Land Cover Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Land Cover Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAnalytics.landCover.map((item) => (
              <div key={item.type}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{item.type}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.percentage}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Infrastructure Crossings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Infrastructure Crossings</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">
                {mockAnalytics.crossings.railroads}
              </div>
              <div className="text-sm text-muted-foreground">Railroads</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">
                {mockAnalytics.crossings.transmissionLines}
              </div>
              <div className="text-sm text-muted-foreground">
                Transmission Lines
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">
                {mockAnalytics.crossings.pipelines}
              </div>
              <div className="text-sm text-muted-foreground">Pipelines</div>
            </div>
          </CardContent>
        </Card>

        {/* Elevation Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Elevation Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end justify-around gap-1">
              {Array.from({ length: 50 }).map((_, i) => {
                const height =
                  Math.sin(i / 5) * 30 +
                  Math.random() * 20 +
                  50;
                return (
                  <div
                    key={i}
                    className="bg-primary/60 w-full rounded-t"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>Min: {mockAnalytics.elevation.min}m</span>
              <span>Avg: {mockAnalytics.elevation.avg}m</span>
              <span>Max: {mockAnalytics.elevation.max}m</span>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default StepAnalytics;