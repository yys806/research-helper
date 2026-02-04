import { FormulaResponse, ChatMessage } from "../types";
import { getApiKey } from "./apiKeyStore";

const BASE_URL = "https://api.siliconflow.cn/v1";
const TEXT_MODEL = "deepseek-ai/DeepSeek-V3.2";
const TEXT_FALLBACK_MODEL = "zai-org/GLM-4.6V";
const VISION_MODEL = "Qwen/Qwen3-VL-32B-Instruct";
const VISION_FALLBACK_MODEL = "zai-org/GLM-4.6V";

// Chunking config to keep full content without hard truncation
const NOTE_CHUNK_SIZE = 9000; // characters per chunk sent to model
const NOTE_CHUNK_OVERLAP = 300; // small overlap to preserve context between chunks

const cleanBase64 = (base64: string) => base64.replace(/^data:(image|application)\/([a-zA-Z0-9.+-]+);base64,/, "");

const ensureDataUrl = (base64: string, mime: string) =>
  base64.startsWith("data:") ? base64 : `data:${mime};base64,${cleanBase64(base64)}`;

const getMimeType = (base64: string) => {
  const match = base64.match(/^data:(image|application)\/([a-zA-Z0-9.+-]+);base64,/);
  if (match) return `${match[1]}/${match[2]}`;
  return "image/png";
};

class MissingKeyError extends Error {}

const ensureApiKey = () => {
  const key = getApiKey();
  if (!key) {
    throw new MissingKeyError("请先在顶部输入 SiliconFlow API Key（仅保存在本地浏览器）。");
  }
  return key;
};

type ChatMessagePayload = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
        | { type: "file"; file: { url: string; mime_type?: string; name?: string } }
      >;
};

const callSiliconChat = async (
  model: string,
  messages: ChatMessagePayload[],
  options: Record<string, unknown> = {}
): Promise<string> => {
  const apiKey = ensureApiKey();

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: 0.2,
      ...options,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || data?.message || res.statusText;
    throw new Error(message || "SiliconFlow API 请求失败");
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("模型未返回内容");
  }

  let text: string;
  if (Array.isArray(content)) {
    // OpenAI-style array content
    const textPart = content.find((c: any) => c?.type === "text");
    text = textPart?.text || "";
  } else {
    text = content as string;
  }

  if (!text.trim()) {
    throw new Error("模型返回为空，请稍后重试或检查文件大小/格式");
  }

  return text;
};

const callWithFallback = async (
  primaryModel: string,
  fallbackModel: string,
  messages: ChatMessagePayload[],
  options: Record<string, unknown> = {}
) => {
  try {
    return await callSiliconChat(primaryModel, messages, options);
  } catch (err) {
    console.warn(`${primaryModel} 调用失败，尝试备用模型 ${fallbackModel}`, err);
    return await callSiliconChat(fallbackModel, messages, options);
  }
};

// Split long text into overlapping chunks to avoid truncation while staying within model context
const splitIntoChunks = (text: string, size = NOTE_CHUNK_SIZE, overlap = NOTE_CHUNK_OVERLAP): string[] => {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    if (end === text.length) break;
    start = end - overlap; // step back a little to keep context
  }
  return chunks;
};

const parseFormulaJson = (text: string): FormulaResponse => {
  try {
    const parsed = JSON.parse(text);
    return {
      latex: parsed.latex?.trim?.() || "",
      explanation: parsed.explanation?.trim?.() || "",
    };
  } catch (err) {
    console.error("解析公式 JSON 失败", err, text);
    throw new Error("AI 返回格式异常，请重试");
  }
};

export const analyzeImage = async (base64Image: string): Promise<FormulaResponse> => {
  const imageUrl = ensureDataUrl(base64Image, getMimeType(base64Image));

  const messages: ChatMessagePayload[] = [
    {
      role: "system",
      content: "你是数学公式识别与讲解助手，返回 JSON，字段 latex（使用 $$ 包裹的 LaTeX）和 explanation（简体中文解释）。",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "请提取图中的数学公式，严格输出 JSON 格式。" },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const text = await callWithFallback(VISION_MODEL, VISION_FALLBACK_MODEL, messages, {
    response_format: { type: "json_object" },
  });

  return parseFormulaJson(text);
};

export const analyzePaper = async (pdfText: string, title?: string): Promise<string> => {
  const chunks = splitIntoChunks(pdfText);

  // Process each chunk sequentially to respect rate limits and preserve order
  const partialNotes: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const messages: ChatMessagePayload[] = [
      {
        role: "system",
        content:
          "你是一名学术精读助手，请输出结构化的 Markdown 精读笔记（简体中文）。" +
          "保持原有章节/小节顺序，重点标出公式（用 $$ 包裹 LaTeX）与结论，勿遗漏本段内容。",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              `论文标题: ${title || "未命名论文"}\n` +
              `以下是第 ${i + 1}/${chunks.length} 段的 PDF 纯文本（包含少量上下文重叠）。\n` +
              "请仅基于这段内容生成精读笔记，并保留对应的小标题/序号，勿笼统概括其他段落。\n\n" +
              chunk,
          },
        ],
      },
    ];

    const note = await callWithFallback(TEXT_MODEL, TEXT_FALLBACK_MODEL, messages, {
      // 稍高的 token 上限，确保每段输出完整
      max_tokens: 5200,
    });

    partialNotes.push(`## 部分 ${i + 1}\n${note.trim()}`);
  }

  // 合并所有分段笔记，前置总标题，确保浏览时能看到完整内容
  return `# 精读笔记（完整无截断）\n${partialNotes.join("\n\n")}`;
};

export const analyzeChart = async (base64Image: string): Promise<string> => {
  const imageUrl = ensureDataUrl(base64Image, getMimeType(base64Image));

  const messages: ChatMessagePayload[] = [
    {
      role: "system",
      content: "你是科研图表解析助手，使用 Markdown 中文回答。",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "请解析这张图表：1) 描述内容；2) 解释坐标/图例；3) 概括趋势与异常；4) 给出结论。",
        },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  return callWithFallback(VISION_MODEL, VISION_FALLBACK_MODEL, messages, { max_tokens: 1200 });
};

export const chatWithPaper = async (
  paperText: string,
  history: ChatMessage[],
  newMessage: string,
  title?: string
): Promise<string> => {
  if (!paperText?.trim()) {
    throw new Error("PDF 文本为空，无法回答，请重新上传文件。");
  }

  const truncated = paperText.length > 12000 ? paperText.slice(0, 12000) + "\n\n[内容截断，后续略]" : paperText;

  const historyText = history
    .map((m) => `${m.role === "user" ? "用户" : "助手"}: ${m.text}`)
    .join("\n");

  const messages: ChatMessagePayload[] = [
    {
      role: "system",
      content: "你是学术论文问答助手，请结合给定论文文本，用简体中文简洁作答。",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            `论文标题: ${title || "未命名论文"}\n` +
            `论文内容（截断可能存在）:\n${truncated}\n\n` +
            `历史对话:\n${historyText}\n\n` +
            `新问题: ${newMessage}`,
        },
      ],
    },
  ];

  return callWithFallback(TEXT_MODEL, TEXT_FALLBACK_MODEL, messages, { max_tokens: 800 });
};
