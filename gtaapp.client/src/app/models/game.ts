export interface MapTypeInfo {
  id: string;
  label: string;
}

export interface GameMapInfo {
  tilePath: string;
  imageSize: number;
  maxZoom: number;
  mapTypes: MapTypeInfo[];
}

export interface GameManifest {
  id: string;
  name: string;
  status: string;
  map: GameMapInfo | null;
}