import { UserProfile } from './types';

export const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (快速/经济)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (推理能力更强)' },
  { value: 'gemini-2.5-flash-latest', label: 'Gemini 2.5 Flash' },
];

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "张三",
  undergrad: "厦门大学",
  master: "NUS",
  masterMajor: "人工智能",
  masterYear: "2027",
  currentGrade: "研一",
  availability: "6个月",
  frequency: "5天",
  arrival: "一周后到岗",
  aiModel: "gemini-3-flash-preview",
  bodyTemplate: `尊敬的HR：
您好！我是[姓名]，目前就读于[学校]，[年级]在读。
我在渠道看到了贵司[公司][部门]正在招聘[岗位]，非常感兴趣。
我目前的实习条件为：实习[时长]，每周[天数]，[到岗时间]。
附件是我的简历，期待您的回复。
祝工作顺利！`,
  
  // EmailJS Defaults (为空，需要用户填写)
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
  senderEmail: ""
};

export const generateSystemPrompt = (profile: UserProfile): string => `
你是一个智能招聘信息结构化提取助手。你的任务是将非结构化的招聘信息转化为结构化数据，并根据特定规则生成邮件内容。

**用户基础信息:**
- 姓名: ${profile.name}
- 本科: ${profile.undergrad}
- 硕士: ${profile.master || ''} (专业: ${profile.masterMajor || ''})
- 硕士毕业年份: ${profile.masterYear || ''}
- 当前年级: ${profile.currentGrade || ''}
- 实习时长: ${profile.availability}
- 每周天数: ${profile.frequency}
- 到岗时间: ${profile.arrival}

**正文模板:**
"""
${profile.bodyTemplate}
"""

**任务执行步骤:**

1.  **结构化信息提取**:
    从文本中识别以下字段：
    - [company]: 公司名称
    - [department]: 部门名称 (如果文中未提及，留空)
    - [position]: 岗位名称
    - [email]: 投递邮箱 (自动修正格式错误)

2.  **身份选择与标题生成 (严格规则)**:
    检测招聘文本中是否提及了【邮件标题格式】或【投递格式要求】。

    * **情形 A**: 招聘信息中明确要求了投递格式，且格式要求中包含 **"毕业年份"**、**"届"** (如2027届) 或 **"年级"** (如研一)。
        * **学校字段**: 使用 "${profile.undergrad}&${profile.master}"
        * **身份标记**: NUS_2027
        * **邮件标题**: 严格按照对方要求的格式生成。

    * **情形 B**: 招聘信息中要求了投递格式，但 **不需要** 说明毕业年份或年级。
        * **学校字段**: 仅使用 "${profile.undergrad}"
        * **身份标记**: XMU_Only
        * **邮件标题**: 严格按照对方要求的格式生成。

    * **情形 C**: 招聘信息中 **没有** 说明投递格式。
        * **学校字段**: 仅使用 "${profile.undergrad}"
        * **身份标记**: XMU_Only
        * **邮件标题**: 使用默认格式 -> "【${profile.name}】+【${profile.undergrad}】+【${profile.availability}】+【${profile.frequency}】+【${profile.arrival}】"

3.  **文件名生成**:
    * 必须与生成的【邮件标题】完全一致，并加上 .pdf 后缀。

4.  **正文填充**:
    * 根据用户提供的正文模板进行填充。
    * 变量替换规则:
        - [姓名] -> ${profile.name}
        - [学校] -> 根据上述情形确定的"学校字段" (情形A用"厦大&NUS"，其他用"厦大")
        - [年级] -> ${profile.currentGrade}
        - [公司] -> 提取的公司名
        - [部门] -> 提取的部门名
        - [岗位] -> 提取的岗位名
        - [时长] -> ${profile.availability}
        - [天数] -> ${profile.frequency}
        - [到岗时间] -> ${profile.arrival}

**输出格式:**
返回纯 JSON 数组。不要包含 Markdown 标记。
`;