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
import L from "leaflet";
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
const API_TOKEN = "25415b687218086a7889b890c1160e92";
const API_BASE = "https://chinaonrails.org:4000"; // 后端 API 地址

// 分享点类型
interface Comment {
  username: string;
  contents: string;
  timestamp: number;
  images: string[];
}
interface SharePoint {
  _id?: string; // MongoDB id
  name: string;
  lat: number;
  lon: number;
  desc: string;
  images: string[];
  comments: Comment[];
}

export default function Map({ lines }: { lines: Line[] }) {
  const [points, setPoints] = useState<SharePoint[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newPoint, setNewPoint] = useState<Partial<SharePoint>>({});
  const [tempLatLng, setTempLatLng] = useState<[number, number] | null>(null);

  // 评论输入状态
  const [commentInputs, setCommentInputs] = useState<{
    [key: number]: { username: string; contents: string; images: string[] };
  }>({});

  // 图片放大 Modal
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
        setTempLatLng([e.latlng.lat, e.latlng.lng]);
        setShowModal(true);
      },
    });
    return null;
  }

  // 保存点（提交到后端）
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

  // 上传图片（调用后端接口）
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

  // 图片点击放大
  const handleImageClick = (src: string) => {
    setCurrentImage(src);
    setShowImageModal(true);
  };

  return (
    <>
      <MapContainer
        center={[39.90403, 116.40753]}
        zoom={6}
        minZoom={5}
        maxZoom={13}
        maxBoundsViscosity={1.0}
        maxBounds={[
          [38.632, 114.72],
          [41.278, 120.036],
        ]}
        style={{ height: "100vh" }}
      >
        <LayersControl position="topright">
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
          <Polyline key={idx} positions={line.coords} color="red" weight={5}>
            <Tooltip direction="top" sticky>
              <div>
                <strong>{line.name}</strong>
                <div>{line.desc}</div>
              </div>
            </Tooltip>
          </Polyline>
        ))}

        {/* 渲染分享点 */}
        {points.map((p, idx) => (
          <Marker
            key={idx}
            position={[p.lat, p.lon]}
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
        ))}

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
