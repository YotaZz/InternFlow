// src/services/jobService.ts
import { supabase } from '../lib/supabaseClient';
import { JobApplication, ParsingResult } from '../types';

// 1. 获取当前登录用户的辅助函数
const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("用户未登录，请先登录");
  }
  return session.user;
};

// 2. 读取列表 (只读取当前用户的数据)
export const fetchJobs = async (): Promise<JobApplication[]> => {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('internflow_entries')
    .select('*')
    .eq('user_id', user.id) // 增加：只看自己的
    .order('created_at', { ascending: false });

  if (error) {
      console.error("Error fetching jobs:", error);
      return [];
  }
  
  return data.map((item: any) => ({
      ...item,
      selected: false,
      logs: [],
      filename: `${item.email_subject}.pdf`
  }));
};

// 3. 解析后保存
export const saveParsedJobs = async (results: ParsingResult[], rawText: string) => {
  const user = await getCurrentUser(); // 获取真实用户
  
  const rows = results.map(res => ({
    user_id: user.id, // 使用真实 ID
    company: res.company,
    department: res.department,
    position: res.position,
    email: res.email,
    profile_selected: res.profile_selected,
    email_subject: res.email_subject,
    opening_line: res.opening_line,
    job_source_line: res.job_source_line,
    praise_line: res.praise_line,
    needs_review: res.needs_review,
    review_reason: res.review_reason,
    pass_filter: res.pass_filter,
    filter_reason: res.filter_reason,
    raw_requirement: rawText,
    status: res.pass_filter ? 'pending' : 'filtered'
  }));

  const { data, error } = await supabase
    .from('internflow_entries')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
};

// 4. 更新状态
export const updateJobStatus = async (id: string, status: string) => {
  const { error } = await supabase
    .from('internflow_entries')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

// 5. 【核心】同步到 JobFlow 的 jobs 表
export const syncToInterviewManager = async (job: JobApplication) => {
  const user = await getCurrentUser();
  
  // 逻辑：Position = 部门 + 岗位 (如果有部门的话)
  const finalPosition = job.department 
    ? `${job.department}-${job.position}` 
    : job.position;

  // 默认步骤配置
  const defaultSteps = ["已投递", "初筛", "笔试", "一面", "二面", "HR面", "OC"];
  
  // 初始化时间记录
  const now = Date.now();
  const initialStepDates = { "0": now }; // 0 代表 "已投递"

  const { error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,          // 绑定账号 ID
      email: user.email,         // 绑定账号邮箱 (JobFlow 逻辑)
      
      company: job.company,
      position: finalPosition,   // 【自定义拼接逻辑】
      job_type: 'internship',    // 【固定为实习】
      
      steps: defaultSteps,
      current_step_index: 0,     // 初始状态：已投递
      current_step_status: 'in-progress',
      step_dates: initialStepDates,
      
      base: '',                  // 可选，留空
      tags: ['InternFlow'],      // 打个标，方便在 JobFlow 里筛选
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (insertError) throw insertError;

  // 同步成功后，更新当前表状态
  await updateJobStatus(job.id, 'interview');
};