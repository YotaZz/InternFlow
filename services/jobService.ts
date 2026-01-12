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

// services/jobService.ts

// [修改] 重新排列所有序号的函数 (核心逻辑)
// 改用标准 update 避免 upsert 的 400 校验问题
export const reorderJobSequences = async () => {
  const user = await getCurrentUser();

  // 1. 获取该用户所有记录，按创建时间正序排列
  const { data: allJobs, error: fetchError } = await supabase
    .from('internflow_entries')
    .select('id, created_at') 
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (fetchError) throw fetchError;
  if (!allJobs || allJobs.length === 0) return;

  // 2. 使用 Promise.all 并发执行 update
  // 相比 upsert，直接 update 不会校验缺失字段，也不会被误判为 insert，非常稳定
  const updatePromises = allJobs.map((job, index) => {
    return supabase
      .from('internflow_entries')
      .update({ 
        seq_id: index + 1, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', job.id); // 精确指定更新哪一行
  });

  // 等待所有更新完成
  const results = await Promise.all(updatePromises);

  // 3. 检查是否有任何一个请求失败
  const firstError = results.find(r => r.error)?.error;
  if (firstError) throw firstError;
};


// 2. 读取列表
export const fetchJobs = async (): Promise<JobApplication[]> => {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('internflow_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('seq_id', { ascending: false }); // 列表展示时倒序，新数据(大序号)在前

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
  
  // [修改] 插入时不计算复杂序号，直接插入，随后统一重排
  const rows = results.map(res => {
    return {
        user_id: user.id,
        seq_id: 0, // 占位符
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
    };
  });

  const { error } = await supabase
    .from('internflow_entries')
    .insert(rows);

  if (error) throw error;

  // [关键] 插入完成后，执行全表序号重排，确保连续
  await reorderJobSequences();

  return true;
};

// 4. 更新单条状态
export const updateJobStatus = async (id: string, status: string) => {
  const { error } = await supabase
    .from('internflow_entries')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
};

// [新增] 批量更新状态 (用于批量软删除)
export const updateJobsStatus = async (ids: string[], status: string) => {
  const { error } = await supabase
    .from('internflow_entries')
    .update({ status })
    .in('id', ids);
  if (error) throw error;
};

// 5. 通用更新
export const updateJob = async (id: string, updates: Partial<JobApplication>) => {
  const { selected, logs, filename, seq_id, created_at, ...dbUpdates } = updates as any;
  const { error } = await supabase
    .from('internflow_entries')
    .update(dbUpdates)
    .eq('id', id);
  if (error) throw error;
};

// 6. 删除单条记录 (物理删除)
export const deleteJobById = async (id: string) => {
  const { error } = await supabase
    .from('internflow_entries')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// 7. 批量删除记录 (物理删除)
export const deleteJobsByIds = async (ids: string[]) => {
  const { error } = await supabase
    .from('internflow_entries')
    .delete()
    .in('id', ids);
  if (error) throw error;
};

// 8. 同步到面试表
export const syncToInterviewManager = async (job: JobApplication) => {
  const user = await getCurrentUser();
  const finalPosition = job.department ? `${job.department}-${job.position}` : job.position;
  const defaultSteps = ["已投递", "初筛", "笔试", "一面", "二面", "HR面", "OC"];
  const initialStepDates = { "0": Date.now() };

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