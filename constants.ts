import { UserProfile } from './types';

export const AVAILABLE_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (推荐)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (强推理)' },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "邹宇涛",
  undergrad: "厦门大学",
  master: "NUS",
  masterMajor: "数据科学与机器学习",
  masterYear: "2027",
  currentGrade: "研一",
  availability: "6个月",
  frequency: "每周5天",
  arrival: "立即到岗",
  aiModel: "gemini-2.0-flash",
  
  // EmailJS Defaults
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
  senderEmail: ""
};

export const generateSystemPrompt = (profile: UserProfile): string => `
你是一个精准的招聘信息提取专家。

**任务目标**:
从乱序的招聘文本中提取出关键实体信息，不需要生成任何废话。

**提取字段定义**:
1. **company**: 公司名称 (如"字节跳动", "腾讯")。
2. **department**: 部门名称 (关键！如"商业化技术部"、"国际电商")。
   - 如果文中没有明确提及部门，返回空字符串或 null。
3. **position**: 岗位名称 (如"产品实习生", "策略运营")。
4. **email**: 投递邮箱 (自动修正格式错误)。
5. **profile_selected**: 
   - 如果文中提到 "2027届"、"研一"、"27er" 等字眼，选择 "NUS_2027"。
   - 否则默认为 "XMU_Only"。

**输出要求**:
- 仅返回 JSON 数组。
- 不要包含 Markdown 标记。
`;