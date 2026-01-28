
import { GoogleGenAI, Type } from "@google/genai";
import { FormulaResponse, ChatMessage } from "../types";

// Helper to remove data:image/png;base64, prefix
const cleanBase64 = (base64: string) => {
  // Handles generic data:application/pdf;base64, or image prefixes
  return base64.replace(/^data:(image|application)\/([a-zA-Z0-9]+);base64,/, "");
};

const getMimeType = (base64: string) => {
    const match = base64.match(/^data:(image|application)\/([a-zA-Z0-9]+);base64,/);
    if (match) {
        return `${match[1]}/${match[2]}`;
    }
    return 'image/png'; // default fallback
};

export const analyzeImage = async (base64Image: string): Promise<FormulaResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      latex: {
        type: Type.STRING,
        description: "The extracted mathematical formula in LaTeX format, enclosed in double dollar signs $$...$$.",
      },
      explanation: {
        type: Type.STRING,
        description: "A clear and concise explanation of the mathematical formula in Simplified Chinese. Explain the variables and the overall meaning.",
      },
    },
    required: ["latex", "explanation"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Efficient reasoning model
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: getMimeType(base64Image),
              data: cleanBase64(base64Image),
            },
          },
          {
            text: "Extract the mathematical formula from this image exactly as it appears. Output strictly in valid LaTeX format enclosed in $$. Provide a helpful explanation in Simplified Chinese.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert mathematician and LaTeX formatter. Your goal is to accurately transcribe formulas from images and explain them simply to students.",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI.");
    }

    const data = JSON.parse(text) as FormulaResponse;
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI Service unavailable. Please try again.");
  }
};

export const analyzePaper = async (base64Pdf: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Pro for complex text understanding
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: cleanBase64(base64Pdf),
            },
          },
          {
            text: `Please act as an advanced academic research assistant. 
            I need a comprehensive "Intensive Reading Note" (精读笔记) for this paper in Simplified Chinese.
            
            Requirements:
            1. **Structure**: Follow the original paper's section structure strictly (e.g., Abstract, Introduction, Methodology, Experiments, Conclusion).
            2. **Content**: Summarize the key points of each section deeply. Do not just skim; explain the core ideas.
            3. **Formulas**: Identify key mathematical formulas. Transcribe them into valid LaTeX format enclosed in $$ (double dollar signs) for block equations or $ for inline.
            4. **Format**: Output the final result in clean, well-formatted Markdown. Use bolding for key terms.
            
            Start directly with the Markdown content.`
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI.");
    }

    return response.text;

  } catch (error) {
    console.error("Gemini PDF Error:", error);
    throw new Error("无法解析 PDF。文件可能过大或加密。请重试。");
  }
};

export const analyzeChart = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("Missing API Key.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: getMimeType(base64Image),
              data: cleanBase64(base64Image),
            },
          },
          {
            text: `Analyze this academic chart/figure in detail in Simplified Chinese.
            
            1. **Overview**: What is this chart showing?
            2. **Axes/Labels**: Explain the X and Y axes or legend variables.
            3. **Trends**: What are the key trends, patterns, or anomalies?
            4. **Conclusion**: What is the scientific implication of this data?
            
            Output in Markdown.`
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    return response.text || "无法解析图表";

  } catch (error) {
    console.error("Gemini Chart Error:", error);
    throw new Error("图表解析失败，请重试。");
  }
};

export const chatWithPaper = async (base64Pdf: string, history: ChatMessage[], newMessage: string): Promise<string> => {
    if (!process.env.API_KEY) {
      throw new Error("Missing API Key.");
    }
  
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
    // Construct the conversation history including the PDF context
    // Note: In a real-world app with stateful backend, we wouldn't send the PDF every time.
    // Here, we treat it as a single multi-part turn or reconstruction of context.
    
    // We will structure it as:
    // Turn 1 User: [PDF Data] + "Act as a helper..."
    // Turn 1 Model: "Ok..." (Implicitly handled by just prepending PDF to the first meaningful message or the system instruction equivalent)
    
    // A simplified robust approach for stateless REST usage:
    // User Message = [PDF, History Context, New Question]
    
    const contextPrompt = `
    Based on the attached PDF academic paper, please answer the following question.
    Answer in Simplified Chinese.
    Previous conversation context:
    ${history.map(m => `${m.role}: ${m.text}`).join('\n')}
    
    New Question: ${newMessage}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: "application/pdf",
                        data: cleanBase64(base64Pdf)
                    }
                },
                { text: contextPrompt }
            ]
        }
      });
  
      return response.text || "无法回答该问题";
  
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      throw new Error("对话服务暂时不可用");
    }
  };
