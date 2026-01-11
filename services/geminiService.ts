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

// [修复 1] 定义 Schema: 使用原生 Object/String，移除 SchemaType 枚举
const PARSING_RESULT_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      company: { type: "STRING", description: "公司简称" },
      department: { type: "STRING", description: "部门简称" },
      position: { type: "STRING", description: "岗位名称" },
      email: { type: "STRING", description: "投递邮箱" },
      // enum 依然是支持的，只要是字符串数组
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

  // 初始化客户端
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = generateSystemPrompt(userProfile);
  
  try {
    // [修复 2] 调用 generateContentStream
    const response = await ai.models.generateContentStream({
        model: userProfile.aiModel,
        contents: [
            { role: "user", parts: [{ text: systemInstruction + "\n\n待解析文本:\n" + inputText }] }
        ],
        config: {
            responseMimeType: "application/json",
            // [修复 3] 参数名为 responseJsonSchema (JS SDK)
            responseJsonSchema: PARSING_RESULT_SCHEMA,
            temperature: 0.5, 
        }
    });

    let fullText = "";
    let processedObjectsCount = 0;

    // [修复 4] 遍历 response 本身，而不是 response.stream
    for await (const chunk of response) {
      // [修复 5] 直接访问 chunk.text 属性，而不是方法 chunk.text()
      const chunkText = chunk.text;
      
      if (!chunkText) continue;
      
      fullText += chunkText;
      
      // 更新思考过程或原始内容
      onThinkUpdate(fullText);

      // 实时提取 JSON 对象
      const allObjects = extractJSONObjects(fullText);
      if (allObjects.length > processedObjectsCount) {
        const newObjects = allObjects.slice(processedObjectsCount);
        newObjects.forEach(obj => onObjectParsed(obj));
        processedObjectsCount = allObjects.length;
      }
    }

    // 结束后再次尝试解析，防止遗漏
    const finalObjects = extractJSONObjects(fullText);
    return finalObjects;

  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    // 错误处理：尝试返回已解析的数据
    const salvaged = extractJSONObjects(""); 
    if (salvaged.length > 0) return salvaged;
    throw error;
  }
};