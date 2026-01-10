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
  
  // 修改处：不再存储完整的 email_body，而是存储三个片段
  opening_line: string;     // 开头称呼
  job_source_line: string;  // 来源句
  praise_line: string;      // 敬佩句

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
  // bodyTemplate 字段其实废弃了，因为模板在EmailJS端，但保留接口定义防报错
  bodyTemplate?: string; 
}

export interface ParsingResult {
  company: string;
  department: string;
  position: string;
  email: string;
  profile_selected: string;
  email_subject: string;
  filename: string;
  
  // 修改处：解析结果也对应三个片段
  opening_line: string;
  job_source_line: string;
  praise_line: string;
}