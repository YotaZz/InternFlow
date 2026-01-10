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
  
  // --- 关键修改：只有片段，没有 body ---
  opening_line: string;
  job_source_line: string;
  praise_line: string;
  // ---------------------------------

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
  
  // 兼容旧字段
  bodyTemplate?: string; 
}

export interface ParsingResult {
  company: string;
  department: string;
  position: string;
  email: string;
  profile_selected: string;
  
  // 解析结果也只包含片段
  opening_line: string;
  job_source_line: string;
  praise_line: string;
}