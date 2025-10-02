import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { BaseMapType } from "@/components/map/BaseMapSelector";

export const createBaseLayer = (type: BaseMapType, opacity: number = 1): TileLayer<any> => {
  let source;

  switch (type) {
    case "satellite":
      source = new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attributions: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      });
      break;

    case "terrain":
      source = new XYZ({
        url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attributions: "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap",
      });
      break;

    case "dark":
      source = new XYZ({
        url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attributions: "© OpenStreetMap contributors © CARTO",
      });
      break;

    case "osm":
    default:
      source = new OSM();
      break;
  }

  return new TileLayer({
    source,
    opacity,
  });
};
