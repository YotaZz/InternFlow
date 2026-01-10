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

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        company: { type: Type.STRING, description: "公司简称" },
        department: { type: Type.STRING, description: "部门简称" },
        position: { type: Type.STRING, description: "岗位名称" },
        email: { type: Type.STRING, description: "投递邮箱" },
        profile_selected: { 
            type: Type.STRING, 
            // [重构] 使用通用枚举值
            enum: ["Base", "Master"], 
            description: "身份策略: Base(仅本科) / Master(本硕)" 
        },
        email_subject: { type: Type.STRING, description: "最终生成的邮件标题" },
        opening_line: { type: Type.STRING },
        job_source_line: { type: Type.STRING },
        praise_line: { type: Type.STRING },
        needs_review: { type: Type.BOOLEAN, description: "信息是否缺失或存疑" }
      },
      required: ["company", "position", "email", "profile_selected", "email_subject", "needs_review"],
    },
  };

  try {
    const systemInstruction = generateSystemPrompt(userProfile);
    
    const response = await ai.models.generateContent({
      model: userProfile.aiModel,
      contents: [{ role: "user", parts: [{ text: inputText }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const rawResults = JSON.parse(text);
    return rawResults;

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};