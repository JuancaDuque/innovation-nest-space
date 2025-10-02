import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import StepAOI from "@/components/project/StepAOI";
import StepParameters from "@/components/project/StepParameters";
import StepPoints from "@/components/project/StepPoints";
import StepRoute from "@/components/project/StepRoute";
import StepAnalytics from "@/components/project/StepAnalytics";
import StepDownload from "@/components/project/StepDownload";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  current_step: number;
  user_id: string;
}

const Project = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setProject(data);
      setActiveStep(data.current_step);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateProjectStep = async (step: number) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ current_step: step })
        .eq("id", id);

      if (error) throw error;
      
      setActiveStep(step);
      if (project) {
        setProject({ ...project, current_step: step });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStepComplete = (completedStep: number) => {
    const nextStep = completedStep + 1;
    if (nextStep <= 6 && project && nextStep > project.current_step) {
      updateProjectStep(nextStep);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const steps = [
    { value: "1", label: "AOI", disabled: false },
    { value: "2", label: "Parameters", disabled: project.current_step < 2 },
    { value: "3", label: "Points", disabled: project.current_step < 3 },
    { value: "4", label: "Route", disabled: project.current_step < 4 },
    { value: "5", label: "Analytics", disabled: project.current_step < 5 },
    { value: "6", label: "Download", disabled: project.current_step < 6 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeStep.toString()} onValueChange={(v) => setActiveStep(parseInt(v))}>
          <TabsList className="grid grid-cols-6 w-full max-w-3xl mx-auto mb-8">
            {steps.map((step) => (
              <TabsTrigger
                key={step.value}
                value={step.value}
                disabled={step.disabled}
              >
                {step.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="1">
            <StepAOI projectId={project.id} onComplete={() => handleStepComplete(1)} />
          </TabsContent>
          
          <TabsContent value="2">
            <StepParameters projectId={project.id} onComplete={() => handleStepComplete(2)} />
          </TabsContent>
          
          <TabsContent value="3">
            <StepPoints projectId={project.id} onComplete={() => handleStepComplete(3)} />
          </TabsContent>
          
          <TabsContent value="4">
            <StepRoute projectId={project.id} onComplete={() => handleStepComplete(4)} />
          </TabsContent>
          
          <TabsContent value="5">
            <StepAnalytics projectId={project.id} onComplete={() => handleStepComplete(5)} />
          </TabsContent>
          
          <TabsContent value="6">
            <StepDownload projectId={project.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Project;