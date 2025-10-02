import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, GitCompare, MapPin, TrendingUp, DollarSign } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Project {
  id: string;
  title: string;
  description: string;
  current_step: number;
}

interface RouteComparatorProps {
  projects: Project[];
  onRemoveProject: (id: string) => void;
  onClose: () => void;
}

const RouteComparator = ({ projects, onRemoveProject, onClose }: RouteComparatorProps) => {
  // Mock route data for demonstration
  const getMockRouteData = (projectId: string, index: number) => ({
    length: (125 + index * 15).toFixed(1),
    cost: (2.4 + index * 0.3).toFixed(1),
    efficiency: (92 - index * 3).toFixed(0),
  });

  const colors = [
    "hsl(220 70% 50%)",
    "hsl(195 75% 50%)",
    "hsl(150 65% 45%)",
    "hsl(280 65% 55%)",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="container h-full flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <GitCompare className="h-6 w-6 text-primary" />
                  Route Comparator
                </CardTitle>
                <CardDescription className="mt-1">
                  Compare multiple routes side by side
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Map View */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Route Overlay Map</h3>
                <div className="h-[400px] bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg border relative overflow-hidden">
                  {/* Mock map with route overlays */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full p-8">
                      {projects.map((project, index) => (
                        <div
                          key={project.id}
                          className="absolute inset-0 flex items-center justify-center opacity-70"
                          style={{
                            transform: `translate(${index * 10}px, ${index * 10}px)`,
                          }}
                        >
                          <svg width="100%" height="100%" className="absolute inset-0">
                            <path
                              d={`M ${100 + index * 30} ${100 + index * 20} Q ${250 + index * 30} ${150 + index * 30} ${400 + index * 30} ${200 + index * 20}`}
                              stroke={colors[index % colors.length]}
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                            />
                          </svg>
                          <MapPin 
                            className="absolute" 
                            style={{ 
                              left: `${100 + index * 30}px`, 
                              top: `${100 + index * 20}px`,
                              color: colors[index % colors.length]
                            }} 
                          />
                          <MapPin 
                            className="absolute" 
                            style={{ 
                              right: `calc(100% - ${400 + index * 30}px)`, 
                              top: `${200 + index * 20}px`,
                              color: colors[index % colors.length]
                            }} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Routes Legend</h4>
                  <div className="flex flex-wrap gap-2">
                    {projects.map((project, index) => (
                      <Badge 
                        key={project.id}
                        variant="outline"
                        className="gap-2"
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        {project.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Comparative Metrics</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {projects.map((project, index) => {
                      const routeData = getMockRouteData(project.id, index);
                      return (
                        <Card 
                          key={project.id}
                          className="border-l-4"
                          style={{ borderLeftColor: colors[index % colors.length] }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base">{project.title}</CardTitle>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 -mt-1 -mr-1"
                                onClick={() => onRemoveProject(project.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>Length</span>
                                </div>
                                <div className="font-semibold">{routeData.length} km</div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  <span>Cost</span>
                                </div>
                                <div className="font-semibold">${routeData.cost}M</div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>Score</span>
                                </div>
                                <div className="font-semibold">{routeData.efficiency}%</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>

                {projects.length === 0 && (
                  <div className="h-[400px] flex items-center justify-center text-center text-muted-foreground">
                    <div>
                      <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Drag project cards here to compare routes</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RouteComparator;
