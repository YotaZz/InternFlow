import { GoogleGenAI, SchemaType } from "@google/genai";
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

  // 简化 Schema，只提取实体
  const responseSchema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        company: { type: SchemaType.STRING, description: "公司名称" },
        department: { type: SchemaType.STRING, description: "部门名称" },
        position: { type: SchemaType.STRING, description: "岗位名称" },
        email: { type: SchemaType.STRING, description: "投递邮箱" },
        profile_selected: { 
            type: SchemaType.STRING, 
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

    // --- 在本地用 TS 生成三个关键句子 ---
    return rawResults.map((raw: any) => {
        const { company, department, position, profile_selected } = raw;

        // 1. 生成标题
        const schoolStr = profile_selected === 'NUS_2027' 
            ? `${userProfile.undergrad}/${userProfile.master}` 
            : userProfile.undergrad;
        const subject = `应聘${position} - ${userProfile.name} - ${schoolStr} - ${company}`;

        // 2. 生成 Opening Line
        const opening_line = `${company}${position}招聘负责人老师：`;

        // 3. 生成 Job Source Line
        // 逻辑：有部门填部门，没部门留空，避免 undefined
        const deptPart = department ? department : "";
        const job_source_line = `我了解到您发布的${deptPart}${position}的招聘JD`;

        // 4. 生成 Praise Line
        // 逻辑：优先夸部门，没部门夸岗位/公司
        const focusArea = department || position; 
        const praise_line = `我对${company}在${focusArea}领域的深耕非常敬佩`;

        return {
            ...raw,
            email_subject: subject,
            filename: `${subject}.pdf`,
            opening_line,      // 注入变量1
            job_source_line,   // 注入变量2
            praise_line        // 注入变量3
        };
    });

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw error;
  }
};