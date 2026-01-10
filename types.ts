// [重构] 移除具体学校名称，使用通用代号
export enum ProfileType {
  Base = 'Base',      // 对应 "仅本科"
  Master = 'Master',  // 对应 "本硕"
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
  
  // [修改] 移除 EmailJS 字段，改为通用邮件配置
  senderEmail: string; // 用于 Reply-To
  bodyTemplate: string; // 本地存储的邮件正文模板
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