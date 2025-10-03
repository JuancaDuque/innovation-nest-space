import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Layers } from "lucide-react";

export type BaseMapType = "osm" | "satellite" | "terrain" | "dark";

interface BaseMapSelectorProps {
  value: BaseMapType;
  onChange: (value: BaseMapType) => void;
  opacity: number;
  onOpacityChange: (value: number) => void;
}

const BaseMapSelector = ({ value, onChange, opacity, onOpacityChange }: BaseMapSelectorProps) => {
  return (
    <div className="flex gap-4 items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="basemap" className="flex items-center gap-2 text-xs">
          <Layers className="h-3 w-3" />
          Base Map
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="basemap" className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="osm">OpenStreetMap</SelectItem>
            <SelectItem value="satellite">Satellite</SelectItem>
            <SelectItem value="terrain">Terrain</SelectItem>
            <SelectItem value="dark">Dark Mode</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2">
        <Label className="flex items-center justify-between text-xs">
          <span>Opacity</span>
          <span className="text-muted-foreground">{Math.round(opacity * 100)}%</span>
        </Label>
        <Slider
          value={[opacity]}
          onValueChange={(values) => onOpacityChange(values[0])}
          min={0.2}
          max={1}
          step={0.1}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default BaseMapSelector;