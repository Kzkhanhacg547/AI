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
const MODEL_NAME = "gemini-2.0-flash"; // Updated model name
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

// AI Chat Endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig,
      safetySettings,
    });

    // Changed approach to use the model directly instead of chat session
    const prompt = personalityPrompt + "\n\nUser: " + message;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();

    // Chỉnh sửa để xuống dòng hợp lý
    const formattedResponse = response
      .replace(/\n{3,}/g, "\n\n") // Giảm số lần xuống dòng liên tiếp
      .replace(/([.!?])\s*([A-Z])/g, "$1\n\n$2") // Xuống dòng sau mỗi câu
      .replace(/\n{3,}/g, "\n\n"); // Loại bỏ quá nhiều dòng trống

    res.json({ reply: formattedResponse });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
