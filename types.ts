// types.ts
export enum ProfileType {
  Base = 'Base',
  Master = 'Master',
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
  review_reason?: string;

  // [新增] 筛选相关
  pass_filter: boolean;
  filter_reason?: string;
}

export interface UserProfile {
  name: string;
  undergrad: string;
  // [新增] 本科专业
  undergradMajor: string;

  master?: string;
  masterMajor?: string;
  masterYear?: string;
  currentGrade?: string;
  availability: string;
  frequency: string;
  arrival: string;
  aiModel: string;
  
  senderEmail: string; 
  smtpUser?: string;
  smtpPass?: string;

  bodyTemplate: string;
  
  // [新增] 岗位筛选条件
  filterCriteria: string;
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
  review_reason?: string;

  // [新增]
  pass_filter: boolean;
  filter_reason?: string;
}



export type JobStatus = 'pending' | 'filtered' | 'sent' | 'interview' | 'error';

export interface JobApplication {
  id: string; // UUID
  company: string;
  department?: string;
  position: string;
  email: string;
  
  status: JobStatus; // 数据库核心字段
  
  profile_selected: ProfileType;
  email_subject: string;
  opening_line: string;
  job_source_line: string;
  praise_line: string;

  needs_review?: boolean;
  review_reason?: string;
  pass_filter: boolean;
  filter_reason?: string;
  raw_requirement?: string;

  // 前端辅助字段 (UI用)
  selected?: boolean; 
  logs?: string[];
  filename?: string;
}

