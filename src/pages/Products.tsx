import { useNavigate } from "react-router-dom";
import { Route, GitBranch, Shuffle, Wind } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string;
  icon: any;
  path: string;
  available: boolean;
}

const products: Product[] = [
  {
    id: "routerator",
    name: "Routerator",
    description: "Designs the optimal route between points.",
    icon: Route,
    path: "/dashboard",
    available: true,
  },
  {
    id: "segmentor",
    name: "Segmentor",
    description: "Analyzes and characterizes a network segment.",
    icon: GitBranch,
    path: "#",
    available: false,
  },
  {
    id: "alternator",
    name: "Alternator",
    description: "Generates alternative paths to a given route.",
    icon: Shuffle,
    path: "#",
    available: false,
  },
  {
    id: "plumator",
    name: "Plumator",
    description: "Calculates dispersion plumes from a segment or network.",
    icon: Wind,
    path: "#",
    available: false,
  },
];

const ProductCard = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const Icon = product.icon;

  const handleClick = () => {
    if (product.available) {
      navigate(product.path);
    }
  };

  return (
    <div
      className="perspective-1000 h-80 w-full cursor-pointer"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
      onClick={handleClick}
    >
      <div
        className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
      >
        {/* Front */}
        <Card
          className={`absolute inset-0 backface-hidden backdrop-blur-lg bg-card/40 border-2 flex flex-col items-center justify-center gap-6 ${
            product.available
              ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
              : "opacity-60"
          }`}
        >
          <div className="p-6 rounded-full bg-primary/10">
            <Icon className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground">{product.name}</h3>
          {!product.available && (
            <span className="text-sm text-muted-foreground font-medium px-4 py-1 rounded-full bg-muted">
              Coming Soon
            </span>
          )}
        </Card>

        {/* Back */}
        <Card
          className={`absolute inset-0 backface-hidden rotate-y-180 backdrop-blur-lg bg-card/40 border-2 flex items-center justify-center p-8 ${
            product.available
              ? "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
              : "opacity-60"
          }`}
        >
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-foreground">{product.name}</h3>
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            {product.available && (
              <div className="pt-4">
                <span className="text-primary font-semibold">Click to start →</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Products = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-foreground">Routify Products</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the right tool for your infrastructure routing needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Products;
