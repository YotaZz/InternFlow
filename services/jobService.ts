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
    .eq('user_id', user.id)
    // [修改] 改为按 seq_id 降序排序
    .order('seq_id', { ascending: false });

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
export const saveParsedJobs = async (results: ParsingResult[], source: string) => {
  const user = await getCurrentUser();
  
  const rows = results.map(res => ({
    user_id: user.id,
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
    status: res.pass_filter ? 'pending' : 'filtered',
    source: source,
  }));

  const { data, error } = await supabase
    .from('internflow_entries')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
};

// 4. 更新状态 (仅更新 status)
export const updateJobStatus = async (id: string, status: string) => {
  const { error } = await supabase
    .from('internflow_entries')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

// 5. 通用更新 (用于编辑详情，同步到数据库)
export const updateJob = async (id: string, updates: Partial<JobApplication>) => {
  // 剔除 UI 专用字段，防止写入数据库报错
  // seq_id 是生成的，通常也不应该被更新，这里一并剔除比较安全，虽然传了也不一定会错
  const { selected, logs, filename, seq_id, created_at, ...dbUpdates } = updates as any;
  
  const { error } = await supabase
    .from('internflow_entries')
    .update(dbUpdates)
    .eq('id', id);
    
  if (error) throw error;
};

// 6. 删除记录
export const deleteJobById = async (id: string) => {
  const { error } = await supabase
    .from('internflow_entries')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

// [新增] 7. 批量删除记录
export const deleteJobsByIds = async (ids: string[]) => {
  const { error } = await supabase
    .from('internflow_entries')
    .delete()
    .in('id', ids);
    
  if (error) throw error;
};

// 8. 同步到 JobFlow 的 jobs 表
export const syncToInterviewManager = async (job: JobApplication) => {
  const user = await getCurrentUser();
  
  const finalPosition = job.department 
    ? `${job.department}-${job.position}` 
    : job.position;

  const defaultSteps = ["已投递", "初筛", "笔试", "一面", "二面", "HR面", "OC"];
  const now = Date.now();
  const initialStepDates = { "0": now };

  const { error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      email: user.email,
      company: job.company,
      position: finalPosition,
      job_type: 'internship',
      steps: defaultSteps,
      current_step_index: 0,
      current_step_status: 'in-progress',
      step_dates: initialStepDates,
      base: '',
      tags: ['InternFlow', job.source],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (insertError) throw insertError;
  await updateJobStatus(job.id, 'interview');
};