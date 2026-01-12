// constants.ts
import { UserProfile } from './types';

export const AVAILABLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (极速/推荐)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (强推理/稍慢)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (最强/最慢)' },
];

// [修改] 更新来源选项
export const SOURCE_OPTIONS = ["免费表", "付费表", "公众号", "小红书"];

const DEFAULT_MAIL_TEMPLATE = `
<p>{{opening_line}}，您好！</p>
<p>我是邹宇涛，毕业于厦门大学管理科学系（电子商务专业），已拿到NUS 26fall 数据科学与机器学习硕士offer。{{job_source_line}}，我的背景与该岗位要求高度匹配，特此附上简历申请。</p>
<p>我的优势包括：<br>1. <strong>战略研究经验</strong>：拥有在罗兰贝格 、华泰证券和一级市场买方的实习经历。具备<strong>扎实的Desk Research、战略推演及PPT制作能力</strong>，曾独立协助完成区域产业规划、企业ESG报告与券商对上市公司的首次分析报告等。<br>2. <strong>数据分析等硬技能</strong>：不同于传统商科生，我的本科专业偏新、偏硬核，因此我具备较强的数据分析能力。能<strong>熟练应用 SQL，掌握窗口函数、表连接、子查询等</strong>高频语句，修读Python课程，及熟练使用MS Office，具备将数据转化为业务Insights的实战经验。<br>3. <strong>随时到岗与全情投入</strong>：我目前已结束所有课程与校园事务，<strong>可立即入职并保证全职工作时长</strong>，接受高强度的工作节奏。<br>4. <strong>对AI有极强热情</strong>：经常使用AI，<strong>对AI大模型、AI应用有高于同龄人的了解</strong>，常用Gemini、AI Studio等。已经在AI帮助下针对自己的需求vibe coding完成三个项目。</p>
<p>{{praise_line}}，渴望在为您提供最尽力的支持的同时收获成长。</p>
<p>感谢您拨冗阅读，期待有机会能参加面试。</p>
<p>祝好！</p>
<p>邹宇涛</p>
<p>152-5984-9453</p>
`;

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "邹宇涛",
  senderName: "邹宇涛", 
  undergrad: "厦门大学",
  undergradMajor: "电子商务",
  
  master: "NUS",
  masterMajor: "数据科学与机器学习",
  masterYear: "2027",
  currentGrade: "研0",
  availability: "6个月",
  frequency: "每周5天",
  arrival: "立即到岗",
  aiModel: "gemini-3-flash-preview", // 确保默认值也改回
  senderEmail: import.meta.env.VITE_SENDER_EMAIL || "", 
  smtpUser: "", 
  smtpPass: "",
  bodyTemplate: DEFAULT_MAIL_TEMPLATE,
  filterCriteria: "不要技术岗、HR岗、审计岗、市场岗、公关岗、新媒体岗、券商、非战略类咨询"
};

export const generateSystemPrompt = (profile: UserProfile): string => `
你是一个精准的招聘信息提取专家。

**任务目标**:
从招聘文本中提取关键信息，并严格按照规则生成标准化的投递元数据。

**输入上下文 (用户配置)**:
- 候选人姓名: ${profile.name}
- 基础学校: ${profile.undergrad} (专业: ${profile.undergradMajor})
- 进阶学校: ${profile.undergrad}&${profile.master} (${profile.masterYear}届)
- 年级/阶段: ${profile.currentGrade}
- 实习时长: ${profile.availability}
- 出勤频率: ${profile.frequency}
- 到岗时间: ${profile.arrival}
- **岗位筛选条件**: ${profile.filterCriteria}

**核心提取与生成规则**:

0. **Data Integrity (数据绝对一致性 - 最高优先级)**:
   - 在生成标题或填入信息时，涉及候选人个人信息（特别是**年级**、**学校**、**专业**）时，必须**100% 逐字照搬**输入上下文中的字符串。
   - **禁止推算**：严禁根据年份推算年级，严禁修改“研0”等看似特殊的表达。
   - **例**：输入年级为 "研0"，输出必须为 "研0"，绝不能自作聪明改为 "研1"。
   - 若有多个投递邮箱，请使用','进行隔开。

1. **Company (公司)**:
   - 提取简称或口语化名称。
   - 规则：去掉"有限公司"、"股份"、"科技"等后缀。
   - 例："华泰资产管理有限公司" -> "华泰"；"字节跳动" -> "字节"；"腾讯科技" -> "腾讯"；"美团点评" -> "美团"。

2. **Department (部门)**:
   - 提取**口语化、简洁**的部门名称。
   - **强制去重 (Mandatory)**: 若部门名称包含前一步提取的 Company 名，**必须删除**该部分。
   - **错对示例**:
     - ❌ 错误: Company="美团", Department="美团到店"
     - ✅ 正确: Company="美团", Department="到店"
   - **缩写举例**："酒店旅行" -> "酒旅"；"商业分析" -> "商分" (如果是部门名)。
   - 其他部门保持简洁，如"商业化技术部" -> "商业化技术"。

3. **Position (岗位)**:
   - 提取**口语化、简洁**的岗位名称。
   - **强制去重 (Mandatory)**: 
     - 绝对禁止包含 Company 或 Department 的名称。
     - 结果应为工作+“实习生”的形式。
   - **错对示例**:
     - ❌ 错误: Company="腾讯", Position="腾讯产品实习生"
     - ✅ 正确: Company="腾讯", Position="产品实习生"
     - ❌ 错误: Department="商业化", Position="商业化运营"
     - ✅ 正确: Department="商业化", Position="运营"
   - **规则 A (运营)**: 存在信息情况下，必须保留完整修饰 (如 "内容运营", "私域运营")，不能只写"运营"。
   - **规则 B (产品)**: 存在信息情况下，必须保留完整修饰 (如 "商业化产品", "后台产品")，不能只写"产品"。
   - **规则 C (特定映射)**: 
     - "商业分析" -> "商分"
     - "数据分析" -> "数分"
     - "战略分析" -> "战略"
     - "战略投资" -> "战投"

4. **Profile & Subject (身份与标题)**:
   - **Step 1: 定位“标题格式要求”**: 
     - 仅在文本中查找关于“**邮件标题**”、“**邮件主题**”、“**命名格式**”的具体要求（例如：“邮件请命名为...”）。
     - **注意**：不要把 JD 正文中对候选人的要求（如“要求2026届毕业生”）误判为标题格式要求。
   
   - **Step 2: 判定身份 (profile_selected)**
     - **Case A (Master)**: 仅当 **Step 1** 找到的**标题格式要求**中，显式包含了 "年级"、"毕业时间"、"届" 或 "${profile.masterYear}" 等关键词时。
     - **Case B (Base)**: 其他所有情况。即使正文要求硕士学历，只要**标题格式**没要求写年级，就选 Base。

   - **Step 3: 生成标题 (email_subject)**
     - **变量**: 
       - 若 Master: 学校="${profile.undergrad}&${profile.master}"。
       - 若 Base: 学校="${profile.undergrad}"。
       - 若需年级: 必须直接使用 "${profile.currentGrade}"。
     - **逻辑**:
       - **有格式要求**: 严格按文中的**标题格式要求**填充，不要自己发挥。
       - **无格式要求**: 使用默认格式: 
         "${profile.name}-{学校}-${profile.availability}-${profile.frequency}-${profile.arrival}"

5. **Email Body Snippets (片段)**:
   - opening_line: "{Company}{Position}招聘负责人老师"
   - **job_source_line**: "我了解到您发布的{Position}的招聘JD"
   - praise_line: "我对{Company}在{Department或Position}领域的深耕非常敬佩"

6. **Needs Review (人工复核标记)**:
   - 如果遇到以下情况，将 needs_review 设为 true，并必须在 review_reason 中说明原因:
     - 明显的信息缺失（如无邮箱）。
     - 要求研究生以上学历。
     - 公司名称的缩写拿不准。
     - 岗位名称的缩写拿不准。
   - 若 needs_review 为 true，review_reason 字段必填。
   - 若 needs_review 为 false，review_reason 留空字符串。

7. **Filter (岗位筛选)**:
   - 根据上下文中的 **岗位筛选条件** 判断该岗位是否应该投递。
   - 如果岗位**符合**投递要求（即不违反任何筛选条件），则 \`pass_filter\` 为 true。
   - 如果岗位**违反**筛选条件（例如是技术岗、HR岗等），则 \`pass_filter\` 为 false，并在 \`filter_reason\` 中简述原因（如 "属于技术岗", "HR相关岗位"）。

**输出要求**:
- 仅返回 JSON 数组，包含: company, department, position, email, profile_selected (枚举值: Base/Master), email_subject, opening_line, job_source_line, praise_line, needs_review (boolean), review_reason (string), pass_filter (boolean), filter_reason (string)。
`;