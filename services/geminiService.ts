import { GoogleGenAI, Type } from "@google/genai";
import { generateSystemPrompt } from "../constants";
import { ParsingResult, UserProfile } from "../types";

export const parseRecruitmentText = async (
  apiKey: string,
  inputText: string,
  userProfile: UserProfile
): Promise<ParsingResult[]> => {
  if (!apiKey) throw new Error("API Key is missing");
  if (!inputText.trim()) return [];

  const ai = new GoogleGenAI({ apiKey });

  // Define the schema based on the user's requirements
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        company: {
          type: Type.STRING,
          description: "公司名称",
        },
        department: {
          type: Type.STRING,
          description: "部门名称",
        },
        position: {
          type: Type.STRING,
          description: "岗位名称",
        },
        email: {
          type: Type.STRING,
          description: "投递邮箱",
        },
        profile_selected: {
          type: Type.STRING,
          enum: ["XMU_Only", "NUS_2027"],
          description: "根据要求选择的身份策略",
        },
        email_subject: {
          type: Type.STRING,
          description: "生成的邮件标题",
        },
        filename: {
          type: Type.STRING,
          description: "简历文件名",
        },
        email_body: {
          type: Type.STRING,
          description: "生成的邮件正文内容 (根据模板填充)",
        }
      },
      required: ["company", "department", "position", "email", "profile_selected", "email_subject", "filename", "email_body"],
    },
  };

  try {
    const systemInstruction = generateSystemPrompt(userProfile);
    
    const response = await ai.models.generateContent({
      model: userProfile.aiModel || "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: `请解析以下招聘文本:\n${inputText}` }],
        },
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return [];
    
    // Parse the JSON string result
    const parsed: ParsingResult[] = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};
