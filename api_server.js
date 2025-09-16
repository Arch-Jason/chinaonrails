import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

// ==== 基础设置 ====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;
const DEL_PASS = "8f6cfb3e-07e1-484f-b448-f5c69c8418b3";

app.use(cors());
app.use(express.json());
app.set("trust proxy", true);

// ==== MongoDB 连接 ====
mongoose.connect("mongodb://127.0.0.1:27017/mapshare", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ==== 定义 Schema ====
const CommentSchema = new mongoose.Schema({
  username: String,
  contents: String,
  timestamp: Number,
  images: [String],
});

const SharePointSchema = new mongoose.Schema({
  name: String,
  lat: Number,
  lon: Number,
  desc: String,
  images: [String],
  comments: [CommentSchema],
  timestamp: { type: Date, default: Date.now }
});

const SharePoint = mongoose.model("SharePoint", SharePointSchema);

// ==== 图片上传配置 ====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname); // 保留原始扩展名
    cb(null, uuidv4() + ext);
  },
});
const upload = multer({ storage });

// 提供静态文件服务：让前端能访问 http://localhost:3000/uploads/xxx.png
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==== 访问日志中间件 ====
const logFile = path.join(__dirname, "api_access_log.csv");
// 如果文件不存在，先写入表头
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, "url,method,ip\n", "utf8");
}

app.use((req, res, next) => {
  const logLine = `${req.originalUrl},${req.method},${req.ip}\n`;
  fs.appendFile(logFile, logLine, (err) => {
    if (err) console.error("日志写入失败:", err);
  });
  next();
});

// ==== API 接口 ====

// 上传图片
app.post("/api/upload", upload.array("files"), (req, res) => {
  const urls = req.files.map((f) => `/uploads/${f.filename}`);
  res.json({ urls });
});

// 获取所有分享点
app.get("/api/points", async (req, res) => {
  const points = await SharePoint.find();
  res.json(points);
});

// 新建分享点
app.post("/api/points", async (req, res) => {
  const point = new SharePoint(req.body);
  await point.save();
  res.json(point);
});

app.delete("/api/points/:id", async (req, res) => {
  const { password } = req.body; // 从请求体获取密码
  if (password !== "8f6cfb3e-07e1-484f-b448-f5c69c8418b3") {
    return res.status(403).json({ success: false, message: "密码错误" });
  }

  await SharePoint.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// 添加评论
app.post("/api/points/:id/comments", async (req, res) => {
  const point = await SharePoint.findById(req.params.id);
  if (!point) return res.status(404).json({ error: "Point not found" });
  point.comments.push(req.body);
  await point.save();
  res.json(point);
});

// ==== 启动服务 ====
app.listen(PORT, () => {
  console.log(`✅ API 服务运行在 http://localhost:${PORT}`);
  console.log(`📂 静态文件服务 http://localhost:${PORT}/uploads/`);
});
