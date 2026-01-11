// src/services/geminiService.ts
// [修改] 切换到 @google/genai SDK
import { GoogleGenAI, SchemaType } from "@google/genai";
import { generateSystemPrompt } from "../constants";
import { ParsingResult, UserProfile } from "../types";

// 辅助函数：从流式文本中提取 JSON 对象
// 专门处理像 [ {..}, {..} ] 这样的流式数组结构
const extractJSONObjects = (text: string): ParsingResult[] => {
  const results: ParsingResult[] = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let isEscaped = false;

  // 简单的状态机，用于识别顶层的大括号 {}
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
        // 找到一个潜在的完整对象
        const jsonStr = text.substring(startIndex, i + 1);
        try {
          const obj = JSON.parse(jsonStr);
          // 简单验证关键字段是否存在
          if (obj.company && obj.position) {
             results.push(obj);
          }
        } catch (e) {
          // 解析失败说明还不是完整的 JSON，忽略
        }
        startIndex = -1;
      }
    }
  }
  return results;
};

// 定义输出的 JSON Schema，Gemini 3 支持 Structured Outputs
const PARSING_RESULT_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      company: { type: SchemaType.STRING, description: "公司简称" },
      department: { type: SchemaType.STRING, description: "部门简称" },
      position: { type: SchemaType.STRING, description: "岗位名称" },
      email: { type: SchemaType.STRING, description: "投递邮箱" },
      profile_selected: { type: SchemaType.STRING, enum: ["Base", "Master"], description: "Base(本科) 或 Master(本硕)" },
      email_subject: { type: SchemaType.STRING },
      opening_line: { type: SchemaType.STRING },
      job_source_line: { type: SchemaType.STRING },
      praise_line: { type: SchemaType.STRING },
      needs_review: { type: SchemaType.BOOLEAN },
      review_reason: { type: SchemaType.STRING },
      pass_filter: { type: SchemaType.BOOLEAN },
      filter_reason: { type: SchemaType.STRING },
    },
    required: ["company", "position", "email", "profile_selected", "email_subject", "needs_review", "pass_filter"],
  },
};

// 流式解析函数
export const parseRecruitmentTextStream = async (
  apiKey: string,
  inputText: string,
  userProfile: UserProfile,
  onThinkUpdate: (text: string) => void,
  onObjectParsed: (obj: ParsingResult) => void
): Promise<ParsingResult[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  if (!inputText.trim()) return [];

  // [修改] 使用新的 SDK 初始化
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = generateSystemPrompt(userProfile);
  
  try {
    // [修改] 使用新的 generateContentStream 方法
    const response = await ai.models.generateContentStream({
        model: userProfile.aiModel,
        contents: [
            { role: "user", parts: [{ text: systemInstruction + "\n\n待解析文本:\n" + inputText }] }
        ],
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: PARSING_RESULT_SCHEMA,
            // [可选] 根据文档建议，Temperature 设为 1.0 (默认)，或者稍微降低一点以保持 JSON 稳定性
            // 文档建议 Gemini 3 保持默认 1.0，但为了 JSON 格式稳定，0.5 也是常见的安全值
            // 此处保持之前的 0.5 逻辑，或者移除让其默认。
            temperature: 0.5, 
        }
    });

    let fullText = "";
    let processedObjectsCount = 0;

    // [修改] 新 SDK 的流处理方式
    for await (const chunk of response.stream) {
      const chunkText = chunk.text();
      if (!chunkText) continue;
      
      fullText += chunkText;
      
      // 更新思考框 (展示原始输出)
      onThinkUpdate(fullText);

      // 提取对象
      const allObjects = extractJSONObjects(fullText);
      if (allObjects.length > processedObjectsCount) {
        const newObjects = allObjects.slice(processedObjectsCount);
        newObjects.forEach(obj => onObjectParsed(obj));
        processedObjectsCount = allObjects.length;
      }
    }

    // 最终尝试解析完整文本，以防遗漏
    const finalObjects = extractJSONObjects(fullText);
    return finalObjects;

  } catch (error) {
    console.error("Gemini Streaming Error:", error);
    // 错误恢复：尝试返回已解析部分
    const salvaged = extractJSONObjects(""); 
    if (salvaged.length > 0) return salvaged;
    throw error;
  }
};