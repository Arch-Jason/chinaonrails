import {
  MapContainer,
  TileLayer,
  LayersControl,
  Polyline,
  Tooltip,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ChangeEvent, useEffect, useState } from "react";
import L, { LatLngExpression } from "leaflet";
import {
  Modal,
  Button,
  Form,
  Card,
  ListGroup,
  Image,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { Line } from "../types";

const { BaseLayer, Overlay } = LayersControl;
const API_BASE = "https://chinaonrails.org:4000"; // 后端 API 地址

// ===== 坐标转换函数 (WGS84 → GCJ-02) =====
function outOfChina(lon: number, lat: number) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number) {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) +
      20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * Math.PI) +
      40.0 * Math.sin((y / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) +
      320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

function transformLon(x: number, y: number) {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) +
      20.0 * Math.sin(2.0 * x * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * Math.PI) +
      40.0 * Math.sin((x / 3.0) * Math.PI)) *
      2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) +
      300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return ret;
}

function wgs84ToGcj02(lon: number, lat: number): [number, number] {
  if (outOfChina(lon, lat)) return [lat, lon];
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformLat(lon - 105.0, lat - 35.0);
  let dLon = transformLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat =
    (dLat * 180.0) /
    (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLon =
    (dLon * 180.0) /
    ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  const mgLat = lat + dLat;
  const mgLon = lon + dLon;
  return [mgLat, mgLon];
}

function gcj02ToWgs84(lon: number, lat: number): [number, number] {
  const [mgLat, mgLon] = wgs84ToGcj02(lon, lat);
  return [lat * 2 - mgLat, lon * 2 - mgLon];
}

// ===== 类型 =====
interface Comment {
  username: string;
  contents: string;
  timestamp: number;
  images: string[];
}
interface SharePoint {
  _id?: string;
  name: string;
  lat: number; // WGS84
  lon: number; // WGS84
  desc: string;
  images: string[];
  comments: Comment[];
}

export default function Map({ lines, showSharePoints, showLines }: { lines: Line[], showSharePoints: boolean, showLines: boolean }) {
  const [points, setPoints] = useState<SharePoint[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newPoint, setNewPoint] = useState<Partial<SharePoint>>({});
  const [tempLatLng, setTempLatLng] = useState<[number, number] | null>(null);

  const [commentInputs, setCommentInputs] = useState<{
    [key: number]: { username: string; contents: string; images: string[] };
  }>({});

  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // 初始化加载所有分享点
  useEffect(() => {
    fetch(`${API_BASE}/api/points`)
      .then((res) => res.json())
      .then((data) => setPoints(data));
  }, []);

  // 点击地图新增点
  function LocationSelector() {
    useMapEvents({
      click(e) {
        const wgsCoords = gcj02ToWgs84(e.latlng.lng, e.latlng.lat);
        setTempLatLng([wgsCoords[0], wgsCoords[1]]); // 存 WGS84
        setShowModal(true);
      },
    });
    return null;
  }

  // 保存点
  const handleSave = async () => {
    if (!tempLatLng || !newPoint.name) return;
    const point: SharePoint = {
      name: newPoint.name!,
      lat: tempLatLng[0],
      lon: tempLatLng[1],
      desc: newPoint.desc || "",
      images: newPoint.images || [],
      comments: [],
    };

    const res = await fetch(`${API_BASE}/api/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(point),
    });
    const savedPoint = await res.json();

    setPoints([...points, savedPoint]);
    setNewPoint({});
    setTempLatLng(null);
    setShowModal(false);
  };

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append("files", file);
    });

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    setNewPoint({
      ...newPoint,
      images: [...(newPoint.images || []), ...data.urls],
    });
  };

  // 评论图片上传
  const handleCommentImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (!e.target.files) return;

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append("files", file);
    });

    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    setCommentInputs({
      ...commentInputs,
      [idx]: {
        ...commentInputs[idx],
        images: [...(commentInputs[idx]?.images || []), ...data.urls],
      },
    });
  };

  // 提交评论
  const handleAddComment = async (idx: number) => {
    const input = commentInputs[idx];
    if (!input?.username || !input?.contents) return;

    const newComment: Comment = {
      username: input.username,
      contents: input.contents,
      timestamp: Date.now(),
      images: input.images || [],
    };

    const pointId = points[idx]._id;
    const res = await fetch(`${API_BASE}/api/points/${pointId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newComment),
    });
    const updatedPoint = await res.json();

    const newPoints = [...points];
    newPoints[idx] = updatedPoint;
    setPoints(newPoints);

    setCommentInputs({
      ...commentInputs,
      [idx]: { username: "", contents: "", images: [] },
    });
  };

  const handleImageClick = (src: string) => {
    setCurrentImage(src);
    setShowImageModal(true);
  };

  return (
    <>
      <MapContainer
        center={[39.90403, 116.40753]}
        zoom={6}
        style={{ height: "100vh" }}
      >
        <LayersControl position="topright">
          <BaseLayer checked name="高德矢量">
            <TileLayer
              url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}"
              subdomains={['1', '2', '3', '4']}
              attribution="© 高德地图"
            />
          </BaseLayer>

          <BaseLayer name="高德影像">
            <TileLayer
              url="https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
              subdomains={['1', '2', '3', '4']}
              attribution="© 高德地图"
            />
          </BaseLayer>

          <Overlay checked name="地名显示">
            <TileLayer
              url="https://webst0{s}.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}"
              subdomains={['1', '2', '3', '4']}
              attribution="© 高德地图"
            />
          </Overlay>
        </LayersControl>

        {/* 渲染线路 (WGS84 → GCJ02) */}
        {lines.map((line, idx) => showLines ? (
          <Polyline
            key={idx}
            positions={line.coords.map((coord: LatLngExpression) => {
              const [lat, lon] = coord as number[];
              return wgs84ToGcj02(lon, lat);
            })}
            color="red"
            weight={5}
          >
            <Tooltip direction="top" sticky>
              <div>
                <strong>{line.name}</strong>
                <div>{line.desc}</div>
              </div>
            </Tooltip>
          </Polyline>
        ) : null)}

        {/* 渲染分享点 (WGS84 → GCJ02) */}
        {points.map((p, idx) => {
          const [lat, lon] = wgs84ToGcj02(p.lon, p.lat);
          return showSharePoints ? (
            <Marker
              key={idx}
              position={[lat, lon]}
              icon={L.icon({
                iconUrl:
                  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              })}
            >
              <Popup maxWidth={300}>
                <Card style={{ width: "18rem" }}>
                  <Card.Body>
                    <Card.Title>{p.name}</Card.Title>
                    <Card.Text>{p.desc}</Card.Text>
                    {p.images.map((img, i) => (
                      <Image
                        key={i}
                        src={`${API_BASE}${img}`}
                        thumbnail
                        style={{
                          maxHeight: "100px",
                          margin: "5px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleImageClick(`${API_BASE}${img}`)}
                      />
                    ))}
                    <hr />
                    <h6>评论</h6>
                    <ListGroup variant="flush">
                      {p.comments.map((c, i) => (
                        <ListGroup.Item key={i}>
                          <div>
                            <strong>{c.username}</strong>
                            <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "5px" }}>
                              {new Date(c.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div>{c.contents}</div>
                          <div className="mt-1 d-flex flex-wrap">
                            {c.images.map((img, j) => (
                              <Image
                                key={j}
                                src={`${API_BASE}${img}`}
                                thumbnail
                                style={{
                                  maxHeight: "80px",
                                  margin: "3px",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleImageClick(`${API_BASE}${img}`)}
                              />
                            ))}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>

                    <hr />

                    <Form className="mt-2">
                      <Form.Group className="mb-2">
                        <Form.Control
                          type="text"
                          placeholder="用户名"
                          value={commentInputs[idx]?.username || ""}
                          onChange={(e) =>
                            setCommentInputs({
                              ...commentInputs,
                              [idx]: {
                                ...commentInputs[idx],
                                username: e.target.value,
                              },
                            })
                          }
                        />
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Control
                          as="textarea"
                          rows={2}
                          placeholder="评论内容"
                          value={commentInputs[idx]?.contents || ""}
                          onChange={(e) =>
                            setCommentInputs({
                              ...commentInputs,
                              [idx]: {
                                ...commentInputs[idx],
                                contents: e.target.value,
                              },
                            })
                          }
                        />
                      </Form.Group>
                      <Form.Group className="mb-2">
                        <Form.Control
                          type="file"
                          accept="image/png, image/jpeg"
                          multiple
                          onChange={(e) =>
                            handleCommentImageUpload(
                              e as ChangeEvent<HTMLInputElement>,
                              idx
                            )
                          }
                        />
                        <div className="mt-2 d-flex flex-wrap">
                          {(commentInputs[idx]?.images || []).map((img, i) => (
                            <Image
                              key={i}
                              src={`${API_BASE}${img}`}
                              thumbnail
                              style={{
                                maxHeight: "60px",
                                margin: "3px",
                                cursor: "pointer",
                              }}
                              onClick={() => handleImageClick(`${API_BASE}${img}`)}
                            />
                          ))}
                        </div>
                      </Form.Group>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddComment(idx)}
                      >
                        发表
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              </Popup>
            </Marker>
          ) : null;
        })}

        <LocationSelector />
      </MapContainer>

      {/* 新建点 Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>新增分享点</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>名称</Form.Label>
              <Form.Control
                type="text"
                value={newPoint.name || ""}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, name: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>描述</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newPoint.desc || ""}
                onChange={(e) =>
                  setNewPoint({ ...newPoint, desc: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>上传图片</Form.Label>
              <Form.Control
                type="file"
                accept="image/png, image/jpeg"
                multiple
                onChange={handleImageUpload}
              />
              <div className="mt-2 d-flex flex-wrap">
                {(newPoint.images || []).map((img, i) => (
                  <Image
                    key={i}
                    src={`${API_BASE}${img}`}
                    thumbnail
                    style={{
                      maxHeight: "80px",
                      margin: "5px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleImageClick(`${API_BASE}${img}`)}
                  />
                ))}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 图片放大 Modal */}
      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
      >
        <Modal.Body className="text-center">
          {currentImage && (
            <Image src={currentImage} fluid style={{ maxHeight: "80vh" }} />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
