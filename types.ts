// [重构] 移除具体学校名称，使用通用代号
export enum ProfileType {
  Base = 'Base',      // 对应原本的 "仅本科" (XMU_Only)
  Master = 'Master',  // 对应原本的 "本硕" (NUS_2027)
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
  
  opening_line: string;
  job_source_line: string;
  praise_line: string;

  raw_requirement?: string;
  selected: boolean;
  status: 'pending' | 'sending' | 'sent' | 'error';
  logs: string[];
  
  needs_review?: boolean;
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
  
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string; 
  senderEmail: string; 
  
  bodyTemplate?: string; 
}

export interface ParsingResult {
  company: string;
  department: string;
  position: string;
  email: string;
  profile_selected: string;
  email_subject: string;
  
  opening_line: string;
  job_source_line: string;
  praise_line: string;

  needs_review: boolean;
}