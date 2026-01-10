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

  // 使用 Type 而不是 SchemaType
  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        company: { type: Type.STRING, description: "公司名称" },
        department: { type: Type.STRING, description: "部门名称" },
        position: { type: Type.STRING, description: "岗位名称" },
        email: { type: Type.STRING, description: "投递邮箱" },
        profile_selected: { 
            type: Type.STRING, 
            enum: ["XMU_Only", "NUS_2027"], 
            description: "身份策略" 
        },
      },
      required: ["company", "position", "email", "profile_selected"],
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

    // --- 本地 TS 逻辑：生成三个关键片段 ---
    return rawResults.map((raw: any) => {
        const { company, department, position } = raw;

        // 1. 生成 Opening Line
        const opening_line = `${company}${position}招聘负责人老师：`;

        // 2. 生成 Job Source Line
        // 逻辑：有部门填部门，没部门留空
        const deptPart = department ? department : "";
        const job_source_line = `我了解到您发布的${deptPart}${position}的招聘JD`;

        // 3. 生成 Praise Line
        // 逻辑：优先夸部门，没部门夸岗位
        const focusArea = department || position; 
        const praise_line = `我对${company}在${focusArea}领域的深耕非常敬佩`;

        return {
            ...raw,
            // 注意：这里我们不再生成 email_body，只返回片段
            opening_line,
            job_source_line,
            praise_line
        };
    });

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};