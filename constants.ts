import { UserProfile } from './types';

// [修正] 严格恢复您指定的 Gemini 3.0 模型 ID，不作修改
export const AVAILABLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (推荐)' },
  { value: 'models/gemini-3-pro-preview', label: 'Gemini 3.0 Pro (强推理)' },
];

// [新增] 默认的邮件 HTML 模板 (用于 Nodemailer)
const DEFAULT_MAIL_TEMPLATE = `
<p>{{opening_line}}</p>
<p>{{job_source_line}}</p>
<p>{{praise_line}}</p>
<br/>
<p>我是{{name}}，{{master_info}}本科毕业于{{undergrad}}。</p>
<p>目前{{currentGrade}}，{{availability}}，{{frequency}}，{{arrival}}。</p>
<br/>
<p>附件是我的简历，希望能有机会加入{{company}}！期待您的回复。</p>
<br/>
<p>祝好，</p>
<p>{{name}}</p>
`;

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "邹宇涛",
  undergrad: "厦门大学",
  master: "NUS",
  masterMajor: "数据科学与机器学习",
  masterYear: "2027",
  currentGrade: "研0",
  availability: "6个月",
  frequency: "每周5天",
  arrival: "立即到岗",
  // [修正] 恢复默认模型为 Gemini 3.0 Flash
  aiModel: "gemini-3-flash-preview",
  
  // [修改] 移除 EmailJS 配置，改为 Nodemailer 所需配置
  senderEmail: import.meta.env.VITE_SENDER_EMAIL || "", // 用于 Reply-To
  bodyTemplate: DEFAULT_MAIL_TEMPLATE // 本地存储的邮件正文模板
};

// [重要] 完整保留原版详细 Prompt，绝不精简
export const generateSystemPrompt = (profile: UserProfile): string => `
你是一个精准的招聘信息提取专家。

**任务目标**:
从招聘文本中提取关键信息，并严格按照规则生成标准化的投递元数据。

**输入上下文 (用户配置)**:
- 候选人姓名: ${profile.name}
- 基础学校: ${profile.undergrad}
- 进阶学校: ${profile.undergrad}&${profile.master} (${profile.masterYear}届)
- 实习时长: ${profile.availability}
- 出勤频率: ${profile.frequency}
- 到岗时间: ${profile.arrival}

**核心提取与生成规则**:

1. **Company (公司)**:
   - 提取简称或口语化名称。
   - 规则：去掉"有限公司"、"股份"、"科技"等后缀。
   - 例："华泰资产管理有限公司" -> "华泰"；"字节跳动" -> "字节"；"腾讯科技" -> "腾讯"；"美团点评" -> "美团"。

2. **Department (部门)**:
   - 提取**口语化、简洁**的部门名称。
   - 不包含与Company解析结果中重复的词。
   - **缩写举例**："酒店旅行" -> "酒旅"；"商业分析" -> "商分" (如果是部门名)。
   - 其他部门保持简洁，如"商业化技术部" -> "商业化技术"。

3. **Position (岗位)**:
   - 提取**口语化、简洁**的部门名称。
   - 不包含与Company、Department解析结果中重复的词。
   - 一般以“实习生”结尾。
   - **规则 A (运营)**: 存在信息情况下，必须保留完整修饰 (如 "内容运营", "私域运营")，不能只写"运营"。
   - **规则 B (产品)**: 存在信息情况下，必须保留完整修饰 (如 "商业化产品", "后台产品")，不能只写"产品"。
   - **规则 C (特定映射)**: 
     - "商业分析" -> "商分"
     - "数据分析" -> "数分"
     - "战略分析" -> "战略"
     - "战略投资" -> "战投"
   - 其他岗位尽可能简洁。

4. **Profile & Subject (身份与标题)**:
   - **Step 1: 扫描格式要求** (检查是否有"邮件命名"、"主题格式"等要求)。
   - **Step 2: 判定身份 (profile_selected)**
     - 格式要求中含 "年级"、"毕业年份"、"${profile.masterYear}"、"届" -> "Master"。
     - 否则 -> "Base"。
   - **Step 3: 生成标题 (email_subject)**
     - **变量**: 
       - 若 Master: 学校="${profile.undergrad}&${profile.master}"。
       - 若 Base: 学校="${profile.undergrad}"。
     - **逻辑**:
       - **有格式要求**: 严格按文中要求的格式填充，不要自己发挥。
       - **无格式要求**: 使用默认格式: 
         "${profile.name}-{学校}-${profile.availability}-${profile.frequency}-${profile.arrival}"

5. **Email Body Snippets (片段)**:
   - opening_line: "{Company}{Position}招聘负责人老师："
   - job_source_line: "我了解到您发布的{Department}{Position}的招聘JD"
   - praise_line: "我对{Company}在{Department或Position}领域的深耕非常敬佩"

6. **Needs Review (人工复核标记)**:
   - 如果遇到以下情况，将 needs_review 设为 true:
     - 明显的信息缺失（如无邮箱）。
     - 要求研究生以上学历。
     - 公司名称的缩写拿不准。
     - 岗位名称的缩写拿不准。
     

**输出要求**:
- 仅返回 JSON 数组，包含: company, department, position, email, profile_selected (枚举值: Base/Master), email_subject, opening_line, job_source_line, praise_line, needs_review (boolean)。
`;