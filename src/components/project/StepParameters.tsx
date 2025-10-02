import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StepParametersProps {
  projectId: string;
  onComplete: () => void;
}

interface ParameterRow {
  layer: string;
  subcategory: string;
  generalWeight: number;
  corridorWeight: number;
  barrierWeight: number;
  enabled: boolean;
}

const defaultParameters: ParameterRow[] = [
  { layer: "Land Cover", subcategory: "Developed", generalWeight: 0.8, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Forest", generalWeight: 0.3, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Cropland", generalWeight: 0.5, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Land Cover", subcategory: "Wetlands", generalWeight: 0.9, corridorWeight: 0, barrierWeight: 0, enabled: true },
  { layer: "Transmission Lines", subcategory: "< 100kV", generalWeight: 0, corridorWeight: 0.2, barrierWeight: 0, enabled: true },
  { layer: "Transmission Lines", subcategory: "100-230kV", generalWeight: 0, corridorWeight: 0.3, barrierWeight: 0, enabled: true },
  { layer: "Transmission Lines", subcategory: "> 230kV", generalWeight: 0, corridorWeight: 0.4, barrierWeight: 0, enabled: true },
  { layer: "Railroads", subcategory: "Low Speed", generalWeight: 0, corridorWeight: 0.3, barrierWeight: 0.4, enabled: true },
  { layer: "Railroads", subcategory: "Medium Speed", generalWeight: 0, corridorWeight: 0.4, barrierWeight: 0.6, enabled: true },
  { layer: "Railroads", subcategory: "High Speed", generalWeight: 0, corridorWeight: 0.5, barrierWeight: 0.8, enabled: true },
];

const StepParameters = ({ projectId, onComplete }: StepParametersProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [parameters, setParameters] = useState<ParameterRow[]>(defaultParameters);

  useEffect(() => {
    loadParameters();
  }, [projectId]);

  const loadParameters = async () => {
    try {
      const { data, error } = await supabase
        .from("routing_parameters")
        .select("parameters")
        .eq("project_id", projectId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.parameters) {
        setParameters(data.parameters as unknown as ParameterRow[]);
      }
    } catch (error: any) {
      console.error("Error loading parameters:", error);
    }
  };

  const handleWeightChange = (index: number, field: keyof ParameterRow, value: number) => {
    const newParameters = [...parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setParameters(newParameters);
  };

  const handleEnabledChange = (index: number, enabled: boolean) => {
    const newParameters = [...parameters];
    newParameters[index] = { ...newParameters[index], enabled };
    setParameters(newParameters);
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from("routing_parameters")
        .select("id")
        .eq("project_id", projectId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("routing_parameters")
          .update({ parameters: parameters as any })
          .eq("project_id", projectId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("routing_parameters")
          .insert({
            project_id: projectId,
            parameters: parameters as any,
          });

        if (error) throw error;
      }

      toast({
        title: "Parameters Saved",
        description: "Your routing parameters have been saved successfully.",
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
        <CardTitle>Step 2: Routing Parameters</CardTitle>
        <CardDescription>
          Configure weights for different layer categories (values between 0-1)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Enable</TableHead>
                <TableHead>Layer</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead className="text-center">General Weight</TableHead>
                <TableHead className="text-center">Corridor Weight</TableHead>
                <TableHead className="text-center">Barrier Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((param, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={param.enabled}
                      onCheckedChange={(checked) =>
                        handleEnabledChange(index, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{param.layer}</TableCell>
                  <TableCell>{param.subcategory}</TableCell>
                  <TableCell>
                    {param.layer === "Land Cover" ? (
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={param.generalWeight}
                        onChange={(e) =>
                          handleWeightChange(
                            index,
                            "generalWeight",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-20 mx-auto"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {param.layer !== "Land Cover" ? (
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={param.corridorWeight}
                        onChange={(e) =>
                          handleWeightChange(
                            index,
                            "corridorWeight",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-20 mx-auto"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {param.layer === "Railroads" ? (
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={param.barrierWeight}
                        onChange={(e) =>
                          handleWeightChange(
                            index,
                            "barrierWeight",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-20 mx-auto"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Parameters
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default StepParameters;