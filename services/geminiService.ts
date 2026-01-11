// src/services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { generateSystemPrompt } from "../constants";
import { ParsingResult, UserProfile } from "../types";

// 辅助函数：从流式文本中提取 JSON 对象
// 保持不变，用于处理流式返回的不完整 JSON 字符串
const extractJSONObjects = (text: string): ParsingResult[] => {
  const results: ParsingResult[] = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (inString) {
      if (char === '\\' && !isEscaped) {
        isEscaped = true;
      } else {
        if (char === '"' && !isEscaped) {
          inString = false;
        }
        isEscaped = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) startIndex = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && startIndex !== -1) {
        const jsonStr = text.substring(startIndex, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          // 简单的校验，确保包含关键字段
          if (obj.company && obj.position) {
             results.push(obj);
          }
        } catch (e) {
          // 忽略解析失败的片段
        }
        startIndex = -1;
      }
    }
  }
  return results;
};


const PARSING_RESULT_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      company: { type: "STRING", description: "公司简称" },
      department: { type: "STRING", description: "部门简称" },
      position: { type: "STRING", description: "岗位名称" },
      email: { type: "STRING", description: "投递邮箱" },
      profile_selected: { type: "STRING", enum: ["Base", "Master"], description: "Base(本科) 或 Master(本硕)" },
      email_subject: { type: "STRING" },
      opening_line: { type: "STRING" },
      job_source_line: { type: "STRING" },
      praise_line: { type: "STRING" },
      needs_review: { type: "BOOLEAN" },
      review_reason: { type: "STRING" },
      pass_filter: { type: "BOOLEAN" },
      filter_reason: { type: "STRING" },
    },
    required: ["company", "position", "email", "profile_selected", "email_subject", "needs_review", "pass_filter"],
  },
};

export const parseRecruitmentTextStream = async (
  apiKey: string,
  inputText: string,
  userProfile: UserProfile,
  onThinkUpdate: (text: string) => void,
  onObjectParsed: (obj: ParsingResult) => void
): Promise<ParsingResult[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  if (!inputText.trim()) return [];

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = generateSystemPrompt(userProfile);
  
  // [关键修改] 只有 Gemini 3 系列模型才开启 Thinking
  // Gemini 2.5 Flash 不支持 includeThoughts，强制开启会导致错误或无意义等待
  const isThinkingModel = userProfile.aiModel.includes("gemini-3");

  const generationConfig: any = {
      responseMimeType: "application/json",
      responseJsonSchema: PARSING_RESULT_SCHEMA,
      temperature: 0.5,
  };

  if (isThinkingModel) {
      generationConfig.thinkingConfig = {
          includeThoughts: true
      };
  }
  
  try {
    const response = await ai.models.generateContentStream({
        model: userProfile.aiModel,
        contents: [
            { role: "user", parts: [{ text: systemInstruction + "\n\n待解析文本:\n" + inputText }] }
        ],
        config: generationConfig
    });

    let fullText = "";
    let processedObjectsCount = 0;

    for await (const chunk of response) {
      // 遍历 parts 以兼容不同的 chunk 结构
      const parts = chunk.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
          // 处理思考内容 (仅当模型支持且返回了 thought 时)
          if (part.thought) {
              if (part.text) {
                  // 这里只更新 UI，不参与 JSON 解析
                  onThinkUpdate(part.text); 
              }
          } 
          // 处理普通文本内容 (即最终的 JSON)
          else if (part.text) {
              fullText += part.text;
              
              // 如果不是思考模型，思考框就不显示内容了，或者你可以显示 "解析中..."
              // 为了用户体验，非思考模型时，我们也可以把进度打到思考框里（可选）
              if (!isThinkingModel) {
                  onThinkUpdate("⚡️ 极速解析中... (Gemini 2.5)");
              }

              const allObjects = extractJSONObjects(fullText);
              if (allObjects.length > processedObjectsCount) {
                const newObjects = allObjects.slice(processedObjectsCount);
                newObjects.forEach(obj => onObjectParsed(obj));
                processedObjectsCount = allObjects.length;
              }
          }
      }
    }

    const finalObjects = extractJSONObjects(fullText);
    return finalObjects;

  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    const salvaged = extractJSONObjects(""); 
    if (salvaged.length > 0) return salvaged;
    throw error;
  }
};