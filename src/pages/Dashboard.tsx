import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { Plus, LogOut, FolderOpen, Loader2, GitCompare, Sparkles } from "lucide-react";
import ProjectCard from "@/components/dashboard/ProjectCard";
import RouteComparator from "@/components/dashboard/RouteComparator";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  current_step: number;
  created_at: string;
  user_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comparatorProjects, setComparatorProjects] = useState<Project[]>([]);
  const [showComparator, setShowComparator] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadProjects();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
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

  const handleCreateProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingProject(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            title,
            description,
            user_id: user?.id,
            status: "active",
            current_step: 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Project created!",
        description: "Your new project has been created successfully.",
      });

      setDialogOpen(false);
      navigate(`/project/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingProject(false);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: "archived" })
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Project archived",
        description: "Project has been moved to archives.",
      });

      loadProjects();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("projectId", projectId);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const projectId = e.dataTransfer.getData("projectId");
    const project = projects.find(p => p.id === projectId);
    
    if (project && !comparatorProjects.find(p => p.id === projectId)) {
      setComparatorProjects(prev => [...prev, project]);
      toast({
        title: "Project added to comparison",
        description: `${project.title} has been added. Drag more projects or click Compare to view.`,
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleRemoveFromComparator = (projectId: string) => {
    setComparatorProjects(prev => prev.filter(p => p.id !== projectId));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => p.status === "active");
  const archivedProjects = projects.filter(p => p.status === "archived");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Routify
                </h1>
                <p className="text-xs text-muted-foreground">Infrastructure Routing Suite</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {comparatorProjects.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setShowComparator(true)}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare ({comparatorProjects.length})
                </Button>
              )}
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">My Projects</h2>
            <p className="text-muted-foreground mt-2">
              Design, analyze, and optimize infrastructure routing
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateProject}>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Start a new infrastructure routing design project
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Highway Extension Project"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Brief description of your project..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creatingProject}>
                    {creatingProject ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {activeProjects.length === 0 && archivedProjects.length === 0 ? (
          <Card className="text-center py-16" style={{ boxShadow: "var(--shadow-card)" }}>
            <CardContent>
              <div className="mb-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground">
                  Create your first infrastructure routing project to get started
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeProjects.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Active Projects</h3>
                </div>
                
                {/* Comparison Drop Zone - Always visible when dragging */}
                <div 
                  className={`mb-6 p-6 rounded-xl border-2 border-dashed transition-all duration-300 ${
                    isDragging 
                      ? "border-primary bg-primary/10 scale-105" 
                      : comparatorProjects.length > 0
                      ? "border-accent/50 bg-accent/5"
                      : "border-muted-foreground/20 bg-muted/5"
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <GitCompare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Route Comparator</h4>
                        <p className="text-sm text-muted-foreground">
                          {comparatorProjects.length === 0 
                            ? "Drag project cards here to compare routes" 
                            : `${comparatorProjects.length} project${comparatorProjects.length > 1 ? 's' : ''} selected`}
                        </p>
                      </div>
                    </div>
                    {comparatorProjects.length > 0 && (
                      <Button 
                        onClick={() => setShowComparator(true)}
                        className="gap-2"
                      >
                        <GitCompare className="h-4 w-4" />
                        Compare Now
                      </Button>
                    )}
                  </div>
                  
                  {/* Show selected projects */}
                  {comparatorProjects.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {comparatorProjects.map((project) => (
                        <div 
                          key={project.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm"
                        >
                          <span className="font-medium">{project.title}</span>
                          <button
                            onClick={() => handleRemoveFromComparator(project.id)}
                            className="hover:text-destructive transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={(id) => navigate(`/project/${id}`)}
                      onArchive={handleArchiveProject}
                      isDraggable={true}
                      onDragStart={(e) => {
                        handleDragStart(e, project.id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {archivedProjects.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-6">Archived Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {archivedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={(id) => navigate(`/project/${id}`)}
                      isArchived={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showComparator && (
        <RouteComparator
          projects={comparatorProjects}
          onRemoveProject={handleRemoveFromComparator}
          onClose={() => setShowComparator(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;