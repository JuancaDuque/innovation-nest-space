import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapIcon } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="text-center space-y-6 p-8">
        <MapIcon className="mx-auto h-16 w-16 text-primary" />
        <h1 className="text-5xl font-bold text-primary">Routify</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Optimal Infrastructure Routing Design
        </p>
        <Button size="lg" onClick={() => navigate("/auth")} className="mt-4">
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default Index;
