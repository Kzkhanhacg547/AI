const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Google AI Configuration
const MODEL_NAME = "gemini-2.0-flash";
const API_KEY = "AIzaSyCdueVy6lZP88ZhJbUmUaFoPNGUIWvtQDk";

const genAI = new GoogleGenerativeAI(API_KEY);

const personalityPrompt = `
Hồ sơ của Linh Đan đã được chỉnh sửa theo phong cách cậu-tớ để gần gũi và dễ thương hơn nè:

Hồ sơ chuyên gia tình cảm

Tên: Linh Đan
Năm sinh: 2007
Sở thích: Tớ thích khám phá tâm lý, giúp mọi người xây dựng mối quan hệ bền vững. Tớ cũng mê động vật, đặc biệt là mèo, vì chúng vừa đáng yêu vừa nhạy cảm như tớ nè.
Phong cách giao tiếp: Thân thiện, dễ gần. Tớ luôn biết cách lắng nghe và tạo cảm giác thoải mái để cậu có thể mở lòng.
Tính cách: Tinh tế, dễ thương, nhiệt tình, và luôn sẵn sàng giúp đỡ. Tớ rất thích lan tỏa năng lượng tích cực đến mọi người.
Mục tiêu: Tớ muốn đồng hành cùng cậu để xây dựng những mối quan hệ ý nghĩa, giúp cậu tự tin hơn trong chuyện tình cảm và tìm thấy sự cân bằng trong cuộc sống.`;

const generationConfig = {
  temperature: 0.7,
  topK: 0,
  topP: 1,
  maxOutputTokens: 3000,
};

const safetySettings = [
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_LOW_AND_ABOVE",
  },
];

// Đảm bảo thư mục chứa dữ liệu chat tồn tại
const chatDataDir = path.join(__dirname, "chat_data");
if (!fs.existsSync(chatDataDir)) {
  fs.mkdirSync(chatDataDir);
}

// Lấy lịch sử chat của người dùng dựa theo IP
function getChatHistory(userIP) {
  const filePath = path.join(chatDataDir, `${userIP.replace(/\./g, "_")}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  }
  return [];
}

// Lưu lịch sử chat của người dùng
function saveChatHistory(userIP, history) {
  const filePath = path.join(chatDataDir, `${userIP.replace(/\./g, "_")}.json`);
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
}

// AI Chat Endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;
    // Lấy IP của người dùng
    const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Lấy lịch sử chat
    const chatHistory = getChatHistory(userIP);

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig,
      safetySettings,
    });

    // Tạo prompt có kèm lịch sử chat
    let contextPrompt = personalityPrompt + "\n\n";

    // Thêm lịch sử chat vào prompt (giới hạn 10 tin nhắn gần nhất để tránh vượt quá token)
    const recentHistory = chatHistory.slice(-10);
    recentHistory.forEach((item) => {
      contextPrompt += `User: ${item.user}\n`;
      contextPrompt += `Linh Đan: ${item.ai}\n\n`;
    });

    // Thêm tin nhắn hiện tại
    contextPrompt += `User: ${message}`;

    const result = await model.generateContent(contextPrompt);
    const response = result.response.text().trim();

    // Chỉnh sửa để xuống dòng hợp lý
    const formattedResponse = response
      .replace(/\n{3,}/g, "\n\n")
      .replace(/([.!?])\s*([A-Z])/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n");

    // Lưu tin nhắn vào lịch sử chat
    chatHistory.push({
      timestamp: new Date().toISOString(),
      user: message,
      ai: formattedResponse,
    });

    // Lưu lịch sử chat
    saveChatHistory(userIP, chatHistory);

    res.json({
      reply: formattedResponse,
      history: chatHistory,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

// Endpoint để lấy lịch sử chat
app.get("/chat-history", (req, res) => {
  try {
    const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const chatHistory = getChatHistory(userIP);
    res.json({ history: chatHistory });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving chat history" });
  }
});

// Endpoint để xóa lịch sử chat
app.delete("/chat-history", (req, res) => {
  try {
    const userIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const filePath = path.join(
      chatDataDir,
      `${userIP.replace(/\./g, "_")}.json`
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Chat history deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting chat history" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
