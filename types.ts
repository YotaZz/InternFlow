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
  email_body: string;
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
  bodyTemplate: string;
  aiModel: string;
  
  // EmailJS Config
  emailjsServiceId: string;
  emailjsTemplateId: string;
  emailjsPublicKey: string; // User ID
  senderEmail: string; // 用于 Reply-To
}

export interface ParsingResult {
  company: string;
  department: string;
  position: string;
  email: string;
  profile_selected: string;
  email_subject: string;
  filename: string;
  email_body: string;
}