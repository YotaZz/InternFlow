// services/geminiService.ts
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
        // [修改] 明确提示支持多个邮箱
        email: { type: Type.STRING, description: "投递邮箱 (如有多个用英文逗号隔开)" },
        profile_selected: { 
            type: Type.STRING, 
            enum: ["Base", "Master"], 
            description: "身份策略: Base(仅本科) / Master(本硕)" 
        },
        email_subject: { type: Type.STRING, description: "最终生成的邮件标题" },
        opening_line: { type: Type.STRING },
        job_source_line: { type: Type.STRING },
        praise_line: { type: Type.STRING },
        needs_review: { type: Type.BOOLEAN, description: "信息是否缺失或存疑" },
        review_reason: { type: Type.STRING, description: "复核的具体原因，若无需复核则为空" },
        
        // [新增] 筛选结果字段
        pass_filter: { type: Type.BOOLEAN, description: "是否通过用户的岗位筛选条件" },
        filter_reason: { type: Type.STRING, description: "未通过筛选的原因" }
      },
      required: ["company", "position", "email", "profile_selected", "email_subject", "needs_review", "pass_filter"],
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
        // [新增] 设置温度为 0.5，降低随机性，提高提取准确度
        temperature: 0.5,
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