export enum ProfileType {
  XMU_Only = 'XMU_Only',
  NUS_2027 = 'NUS_2027',
}

export interface JobApplication {
  id: string;
  company: string;
  department?: string;
  position: string;
  email: string;
  profile_selected: ProfileType;
  email_subject: string;
  filename: string;
  
  // --- 修改点：拆分为三个关键片段，不再存储 email_body ---
  opening_line: string;     // 片段1：开头称呼
  job_source_line: string;  // 片段2：来源句
  praise_line: string;      // 片段3：敬佩句
  // ---------------------------------------------------

  raw_requirement?: string;
  selected: boolean;
  status: 'pending' | 'sending' | 'sent' | 'error';
  logs: string[];
}

export interface UserProfile {
  name: string;
  undergrad: string;
  master?: string;
  masterMajor?: string;
  masterYear?: string;
  currentGrade?: string;
  availability: string;
  frequency: string;
  arrival: string;
  aiModel: string;
  
  // EmailJS Config
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string; 
  senderEmail: string; 
  
  // 设为可选，兼容旧代码
  bodyTemplate?: string; 
}

export interface ParsingResult {
  company: string;
  department: string;
  position: string;
  email: string;
  profile_selected: string;
  
  // 解析结果也对应拆分
  opening_line: string;
  job_source_line: string;
  praise_line: string;
}