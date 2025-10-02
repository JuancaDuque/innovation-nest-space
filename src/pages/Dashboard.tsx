import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { Plus, LogOut, FolderOpen, Archive, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Routify Dashboard</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">My Projects</h2>
            <p className="text-muted-foreground mt-1">
              Manage your infrastructure routing projects
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
          <Card className="text-center py-12">
            <CardContent>
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeProjects.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">Active Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeProjects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <p>Step: {project.current_step} of 6</p>
                          <p>Created: {format(new Date(project.created_at), "MMM d, yyyy")}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => navigate(`/project/${project.id}`)}
                            className="flex-1"
                          >
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                          <Button
                            onClick={() => handleArchiveProject(project.id)}
                            variant="outline"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {archivedProjects.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Archived Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivedProjects.map((project) => (
                    <Card key={project.id} className="opacity-60">
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {project.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                          <p>Step: {project.current_step} of 6</p>
                          <p>Created: {format(new Date(project.created_at), "MMM d, yyyy")}</p>
                        </div>
                        <Button
                          onClick={() => navigate(`/project/${project.id}`)}
                          variant="outline"
                          className="w-full"
                        >
                          <FolderOpen className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;