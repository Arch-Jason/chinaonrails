import { MapContainer, TileLayer, LayersControl, Polyline, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Line } from "../types";

const { BaseLayer, Overlay } = LayersControl;
const API_TOKEN = "25415b687218086a7889b890c1160e92";

interface MapProps {
  lines: Line[];
}

export default function Map({ lines }: MapProps) {
  return (
    <MapContainer center={[39.90403, 116.40753]} zoom={10} style={{ height: "100vh" }}>
      <LayersControl position="topright">
        {/* 底图选择 */}
        <BaseLayer name="矢量">
          <TileLayer
            url={`http://t{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${API_TOKEN}`}
            subdomains="01234567"
            attribution="天地图"
          />
        </BaseLayer>

        <BaseLayer name="影像">
          <TileLayer
            url={`http://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${API_TOKEN}`}
            subdomains="01234567"
            attribution="天地图"
          />
        </BaseLayer>

        <BaseLayer checked name="地形">
          <TileLayer
            url={`http://t{s}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${API_TOKEN}`}
            subdomains="01234567"
            attribution="天地图"
          />
        </BaseLayer>

        {/* 注记图层 */}
        <Overlay checked name="界线">
          <TileLayer
            url={`http://t{s}.tianditu.gov.cn/ibo_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ibo&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${API_TOKEN}`}
            subdomains="01234567"
            attribution="天地图"
          />
        </Overlay>

        <Overlay checked name="地名显示">
          <TileLayer
            url={`http://t{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${API_TOKEN}`}
            subdomains="01234567"
            attribution="天地图"
          />
        </Overlay>
      </LayersControl>

      {/* 渲染线路 */}
      {lines.map((line, idx) => (
        <Polyline
          key={idx}
          positions={line.coords}
          color="red"
          weight={3}
          opacity={0.8}
        >
          <Tooltip direction="top" sticky>
            <div>
              <strong>{line.name}</strong>
              <div>{line.desc}</div>
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </MapContainer>
  );
}
