import { LatLngExpression } from "leaflet";

export interface Line {
    name: string;
    desc: string;
    coords: LatLngExpression[];
};