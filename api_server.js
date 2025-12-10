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

// 如果 uploads 目录不存在则创建，避免 multer 报错
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
  username: { type: String, required: true, trim: true, maxlength: 50 },
  contents: { type: String, required: true, trim: true, maxlength: 1000 },
  timestamp: { type: Number, required: true },
  images: {
    type: [String],
    validate: {
      validator: (arr) => arr.every((v) => typeof v === "string"),
      message: "All images must be string URLs",
    },
    default: [],
  },
});

const SharePointSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  lat: { type: Number, required: true, min: -90, max: 90 },
  lon: { type: Number, required: true, min: -180, max: 180 },
  desc: { type: String, trim: true, maxlength: 2000 },
  images: {
    type: [String],
    validate: {
      validator: (arr) => arr.every((v) => typeof v === "string"),
      message: "All images must be string URLs",
    },
    default: [],
  },
  comments: { type: [CommentSchema], default: [] },
  timestamp: { type: Date, default: Date.now },
});

const SharePoint = mongoose.model("SharePoint", SharePointSchema);

// ==== 图片上传配置（带类型/大小限制） ====
const allowedExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const allowedMime = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // 保留原始扩展名（小写）
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext) || !allowedMime.includes(file.mimetype)) {
      return cb(new Error("Invalid file type. Only image uploads are allowed."));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 单个文件最大 5MB
    files: 10, // 单次最多 10 个文件
  },
});

// 提供静态文件服务：让前端能访问 http://localhost:3000/uploads/xxx.png
app.use("/uploads", express.static(uploadDir));

// ==== 访问日志中间件 ====
const logFile = path.join(__dirname, "api_access_log.csv");
// 如果文件不存在，先写入表头
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, "url,method,ip,time\n", "utf8");
}

app.use((req, res, next) => {
  const localDateTimeString = new Date().toLocaleString();
  const logLine = `${req.originalUrl},${req.method},${req.ip},${localDateTimeString}\n`;
  fs.appendFile(logFile, logLine, (err) => {
    if (err) console.error("日志写入失败:", err);
  });
  next();
});

// ==== API 接口 ====

// 上传图片（带错误处理）
app.post("/api/upload", (req, res) => {
  upload.array("files")(req, res, (err) => {
    if (err) {
      console.error("文件上传错误:", err);
      return res.status(400).json({ error: err.message || "File upload failed" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const urls = req.files.map((f) => `/uploads/${f.filename}`);
    res.json({ urls });
  });
});

// 获取所有分享点
app.get("/api/points", async (req, res) => {
  try {
    const points = await SharePoint.find();
    res.json(points);
  } catch (err) {
    console.error("获取分享点失败:", err);
    res.status(500).json({ error: "Failed to fetch points" });
  }
});

// 新建分享点
app.post("/api/points", async (req, res) => {
  // 原有 IP 限制
  if (req.ip === "175.167.91.51") return;

  // 基础类型检查（避免明显恶意数据）
  if (!validateSharePoint(req.body)) {
    return res.status(400).json({ error: "Invalid SharePoint data format" });
  }

  try {
    const point = new SharePoint(req.body);
    await point.save();
    res.json(point);
  } catch (err) {
    console.error("创建分享点失败:", err);
    res.status(400).json({
      error: "Schema validation failed",
      details: err.message,
    });
  }
});

// 删除分享点
app.delete("/api/points/:id", async (req, res) => {
  const { password } = req.body; // 从请求体获取密码
  if (password !== DEL_PASS) {
    return res.status(403).json({ success: false, message: "密码错误" });
  }

  try {
    await SharePoint.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("删除分享点失败:", err);
    res.status(500).json({ success: false, message: "删除失败" });
  }
});

// 添加评论
app.post("/api/points/:id/comments", async (req, res) => {
  if (!validateComment(req.body)) {
    return res.status(400).json({ error: "Invalid comment data format" });
  }

  try {
    const point = await SharePoint.findById(req.params.id);
    if (!point) return res.status(404).json({ error: "Point not found" });

    point.comments.push(req.body);
    await point.save();
    res.json(point);
  } catch (err) {
    console.error("添加评论失败:", err);
    res.status(400).json({
      error: "Schema validation failed",
      details: err.message,
    });
  }
});

// ==== 启动服务 ====
app.listen(PORT, () => {
  console.log(`✅ API 服务运行在 http://localhost:${PORT}`);
  console.log(`📂 静态文件服务 http://localhost:${PORT}/uploads/`);
});

// validators

function validateSharePoint(body) {
  if (typeof body !== "object" || body === null) return false;

  // Required fields
  if (typeof body.name !== "string") return false;
  if (typeof body.lat !== "number") return false;
  if (typeof body.lon !== "number") return false;

  // Optional fields
  if (body.desc != null && typeof body.desc !== "string") return false;

  if (body.images != null) {
    if (!Array.isArray(body.images)) return false;
    if (!body.images.every((v) => typeof v === "string")) return false;
  }

  // Optional comments on creation (if any)
  if (body.comments != null) {
    if (!Array.isArray(body.comments)) return false;
    if (!body.comments.every(validateComment)) return false;
  }

  return true;
}

function validateComment(body) {
  if (typeof body !== "object" || body === null) return false;

  if (typeof body.username !== "string") return false;
  if (typeof body.contents !== "string") return false;
  if (typeof body.timestamp !== "number") return false;

  if (body.images != null) {
    if (!Array.isArray(body.images)) return false;
    if (!body.images.every((v) => typeof v === "string")) return false;
  }

  return true;
}
