// App.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';

// 组件导入
import ApiKeyInput from './components/ApiKeyInput';
import JobEntryRow from './components/JobEntryRow';
import EmailPreviewModal from './components/EmailPreviewModal';
import UserProfileModal from './components/UserProfileModal';
import { LoginModal } from './components/LoginModal';

// 服务导入
import { parseRecruitmentTextStream } from './services/geminiService';
import { 
    fetchJobs, 
    saveParsedJobs, 
    updateJobStatus, 
    updateJobsStatus, 
    syncToInterviewManager, 
    updateJob, 
    deleteJobById,
    deleteJobsByIds, 
    reorderJobSequences 
} from './services/jobService';

// 类型与常量
import { JobApplication, ParsingResult, UserProfile } from './types';
import { DEFAULT_USER_PROFILE, SOURCE_OPTIONS } from './constants';

// --- 将辅助组件提取到 App 外部 ---

const MaximizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
);

const DuplicateBadge = () => (
    <div className="group relative inline-flex items-center justify-center ml-2 cursor-help">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 border border-orange-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
            重复
        </span>
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 shadow-lg">
            该邮箱存在多条记录
        </div>
    </div>
);

const AIThinkingBox: React.FC<{ text: string }> = ({ text }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [text]);
    return (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/30 overflow-hidden shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100/40 border-b border-indigo-200/30">
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 tracking-wide flex-1">
                    AI 正在思考...
                </span>
            </div>
            <div ref={scrollRef} className="min-h-[8rem] max-h-[20rem] overflow-y-auto p-3 font-mono text-[10px] leading-relaxed text-slate-600 bg-white/40 backdrop-blur-sm [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-indigo-200/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-indigo-300">
                <div className="whitespace-pre-wrap break-words">{text}</div>
            </div>
        </div>
    );
};

// [修复] 将 SourceSelector 移到 App 外部，防止重渲染导致输入中断
interface SourceSelectorProps {
    source: string;
    setSource: (val: string) => void;
    isCustomSource: boolean;
    setIsCustomSource: (val: boolean) => void;
    className?: string;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ 
    source, 
    setSource, 
    isCustomSource, 
    setIsCustomSource, 
    className = "" 
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // 切换到自定义模式时自动聚焦
    useEffect(() => {
        if (isCustomSource) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isCustomSource]);

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">信息来源:</span>
            {!isCustomSource ? (
                <select 
                    value={source} 
                    onChange={(e) => {
                        if (e.target.value === 'custom') {
                            setIsCustomSource(true);
                            setSource('');
                        } else {
                            setSource(e.target.value);
                        }
                    }} 
                    className="bg-gray-50 border border-gray-300 text-gray-800 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5"
                >
                    {SOURCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    <option value="custom">✏️ 手动输入...</option>
                </select>
            ) : (
                <div className="flex items-center gap-1">
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={source} 
                        onChange={e => setSource(e.target.value)}
                        placeholder="输入来源..."
                        className="bg-white border border-gray-300 text-gray-800 text-xs rounded-lg p-1.5 w-32 focus:ring-2 focus:ring-indigo-500"
                    />
                    {/* [修复核心] 点击关闭时，强制重置 source 为列表第一个选项 */}
                    <button 
                        onClick={() => { 
                            setIsCustomSource(false); 
                            setSource(SOURCE_OPTIONS[0]); 
                        }} 
                        className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>
    );
};
// --- App 组件主体 ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  
  // 状态：来源相关
  const [source, setSource] = useState<string>(SOURCE_OPTIONS[0]);
  const [isCustomSource, setIsCustomSource] = useState(false);

  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false); 
  const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'filtered'>('pending');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const duplicateStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach(job => {
        if (job.email) {
            const emails = job.email.split(/[,，]/).map(e => e.trim());
            emails.forEach(e => { if (e) counts[e] = (counts[e] || 0) + 1; });
        }
    });
    return counts;
  }, [jobs]);

  const checkIsDuplicate = (emailString: string) => {
      if (!emailString) return false;
      const emails = emailString.split(/[,，]/).map(e => e.trim());
      return emails.some(e => (duplicateStatus[e] || 0) > 1);
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) loadData();
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadData(); else setJobs([]);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
    } catch (error) {
      console.error("加载数据失败:", error);
    }
  };

  const updateJobLocal = (id: string, updates: Partial<JobApplication>) => {
    setJobs(prev => {
        const newJobs = prev.map(job => job.id === id ? { ...job, ...updates } : job);
        if (previewJob && previewJob.id === id) {
            setPreviewJob({ ...previewJob, ...updates });
        }
        return newJobs;
    });
  };

  const handleFullUpdateJob = async (id: string, updates: Partial<JobApplication>) => {
      updateJobLocal(id, updates);
      try {
          await updateJob(id, updates);
      } catch (err) {
          console.error("Failed to sync update to DB:", err);
          alert("保存失败，请检查网络");
      }
  };

  const deleteJob = async (id: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    const previousJobs = [...jobs];
    const wasPreviewing = previewJob?.id === id;

    if (job.status === 'filtered') {
        if (!confirm("确定要永久删除这条记录吗？此操作无法撤销。")) return;

        setJobs(prev => prev.filter(job => job.id !== id));
        if (wasPreviewing) setPreviewJob(null);

        try {
            await deleteJobById(id);
            await reorderJobSequences();
            await loadData(); 
        } catch (error) {
            console.error("删除失败:", error);
            alert("删除失败，请检查网络。");
            setJobs(previousJobs);
            if (wasPreviewing) {
                 const jobToRestore = previousJobs.find(j => j.id === id);
                 if (jobToRestore) setPreviewJob(jobToRestore);
            }
        }
    } else {
        updateJobLocal(id, { status: 'filtered' });
        try {
             await updateJobStatus(id, 'filtered');
        } catch (error) {
            console.error("软删除失败:", error);
            setJobs(previousJobs); 
        }
    }
  };

  const handleBatchDelete = async () => {
    const selectedJobs = filteredJobsBySearch.filter(j => j.status === activeTab && j.selected);
    const selectedIds = selectedJobs.map(j => j.id);

    if (selectedIds.length === 0) return;

    const isPhysicalDelete = activeTab === 'filtered';
    const msg = isPhysicalDelete 
        ? `⚠️ 确认彻底删除\n\n您选中了 ${selectedIds.length} 条记录，删除后无法恢复。\n确定要继续吗？`
        : `⚠️ 确认移除\n\n您选中了 ${selectedIds.length} 条记录，它们将被移入“已过滤”列表。\n确定要继续吗？`;

    if (!confirm(msg)) return;

    const previousJobs = [...jobs];
    
    if (isPhysicalDelete) {
        setJobs(prev => prev.filter(j => !selectedIds.includes(j.id)));
    } else {
        setJobs(prev => prev.map(j => selectedIds.includes(j.id) ? { ...j, status: 'filtered', selected: false } : j));
    }

    try {
        if (isPhysicalDelete) {
            await deleteJobsByIds(selectedIds);
            await reorderJobSequences();
        } else {
            await updateJobsStatus(selectedIds, 'filtered');
        }
        await loadData(); 
    } catch (error) {
        console.error("批量操作失败:", error);
        alert("操作失败，数据将自动恢复");
        setJobs(previousJobs);
    }
  };

  const toggleSelect = (id: string) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, selected: !job.selected } : job));
  };

  const toggleSelectAll = () => {
    const currentJobs = filteredJobsBySearch.filter(j => j.status === activeTab);
    const allSelected = currentJobs.length > 0 && currentJobs.every(j => j.selected);
    setJobs(prev => prev.map(j => {
        if (j.status === activeTab && currentJobs.find(cj => cj.id === j.id)) {
            return { ...j, selected: !allSelected };
        }
        return j;
    }));
  };

  const handleParse = async () => {
    if (!user) { setIsLoginModalOpen(true); return; }
    if (!apiKey) { alert("请先配置 API Key"); return; }
    if (!inputText.trim()) return;

    setIsInputModalOpen(false);
    setIsParsing(true);
    setThinkingText(""); 
    
    const collectedResults: ParsingResult[] = [];
    
    let tempSeqBase = jobs.length > 0 ? (jobs[0].seq_id || 0) : 0;

    try {
      setActiveTab('pending');

      await parseRecruitmentTextStream(
          apiKey, 
          inputText, 
          userProfile,
          (text) => setThinkingText(text),
          (obj) => {
              collectedResults.push(obj);
              tempSeqBase += 1;
              const tempJob: JobApplication = {
                  id: `temp-${Date.now()}-${Math.random()}`,
                  seq_id: tempSeqBase,
                  user_id: user.id,
                  company: obj.company,
                  department: obj.department,
                  position: obj.position,
                  email: obj.email,
                  profile_selected: obj.profile_selected as any,
                  email_subject: obj.email_subject,
                  opening_line: obj.opening_line,
                  job_source_line: obj.job_source_line,
                  praise_line: obj.praise_line,
                  needs_review: obj.needs_review,
                  review_reason: obj.review_reason,
                  pass_filter: obj.pass_filter,
                  filter_reason: obj.filter_reason,
                  status: obj.pass_filter ? 'pending' : 'filtered',
                  source: source,
                  selected: false,
                  logs: [],
                  filename: `${obj.email_subject}.pdf`
              };
              setJobs(prev => [tempJob, ...prev]);
          }
      );
      
      if (collectedResults.length > 0) {
          await saveParsedJobs(collectedResults, source);
          await loadData(); 
      }
      setInputText(''); 
    } catch (error) {
      console.error(error);
      alert("解析失败，请检查 API Key 或网络连接。");
      loadData();
    } finally {
      setIsParsing(false);
    }
  };

  const handleBatchSend = () => {
    const jobsToSend = jobs.filter(j => j.status === 'pending' && j.selected);
    if (jobsToSend.length === 0) return;
    setIsSending(true);
    setSendProgress(0);
    let processedCount = 0;
    jobsToSend.forEach((job, index) => {
        setTimeout(() => {
            handleSendEmail(job.id);
            processedCount++;
            setSendProgress((processedCount / jobsToSend.length) * 100);
            if (processedCount === jobsToSend.length) {
                setTimeout(() => setIsSending(false), 2000);
            }
        }, index * 10000);
    });
  };


const handleSendEmail = async (jobId: string, overrideJob?: JobApplication) => {
  const job = overrideJob || jobs.find(j => j.id === jobId);
  if (!job) return;

  const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
      const logLine = `[${time}] ${msg}`;
      setJobs(prev => prev.map(j => {
          if (j.id === jobId) return { ...j, logs: [...(j.logs || []), logLine] };
          return j;
      }));
  };

  updateJobLocal(jobId, { status: 'sending' as any });

  // [修改点 1] 日志增加附件提示
  const reportMsg = job.attach_report ? " (+报告)" : "";
  addLog(`正在发送给 ${job.email}...${reportMsg}`);

  try {
      let mailBody = userProfile.bodyTemplate || "";
      mailBody = mailBody.replace(/{{opening_line}}/g, job.opening_line || '')
                          .replace(/{{job_source_line}}/g, job.job_source_line || '')
                          .replace(/{{praise_line}}/g, job.praise_line || '')
                          .replace(/{{company}}/g, job.company)
                          .replace(/{{position}}/g, job.position)
                          .replace(/{{name}}/g, userProfile.name)
                          .replace(/{{undergrad}}/g, userProfile.undergrad)
                          .replace(/{{undergradMajor}}/g, userProfile.undergradMajor)
                          .replace(/{{availability}}/g, userProfile.availability)
                          .replace(/{{frequency}}/g, userProfile.frequency)
                          .replace(/{{arrival}}/g, userProfile.arrival)
                          .replace(/{{currentGrade}}/g, userProfile.currentGrade || '');
      const masterInfo = userProfile.master 
          ? `硕士就读于${userProfile.master}${userProfile.masterMajor ? `(${userProfile.masterMajor})` : ''}，` 
          : "";
      mailBody = mailBody.replace(/{{master_info}}/g, masterInfo);
      
      const fromName = userProfile.senderName || userProfile.name;
      
      const response = await fetch('/api/send_email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              to: job.email,
              subject: job.email_subject,
              html: mailBody,
              replyTo: userProfile.senderEmail || user?.email,
              fromName: fromName, 
              smtpUser: userProfile.smtpUser,
              smtpPass: userProfile.smtpPass,
              // [修改点 2] 传递附件开关状态给后端
              attachReport: job.attach_report 
          })
      });
      
      const data = await response.json();
      if (response.ok) {
          addLog(`发送成功! ID: ${data.messageId}`);
          await updateJobStatus(jobId, 'sent');
          updateJobLocal(jobId, { status: 'sent' });
      } else {
          addLog(`发送失败: ${data.error}`);
          updateJobLocal(jobId, { status: 'error' as any });
      }
  } catch (error: any) {
      console.error("API Error:", error);
      addLog(`Error: ${error.message || 'Network error'}`);
      updateJobLocal(jobId, { status: 'error' as any });
  }
};

  const handleAddToInterview = async (job: JobApplication) => {
    if (!user) { setIsLoginModalOpen(true); return; }
    const targetPositionName = job.department ? `${job.department}-${job.position}` : job.position;
    if (!confirm(`确认将【${job.company}】加入面试进度表吗？\n\n即将创建的记录：\n岗位：${targetPositionName}\n类型：实习`)) {
        return;
    }
    try {
        await syncToInterviewManager(job);
        updateJobLocal(job.id, { status: 'interview' });
        alert("✅ 同步成功！数据已写入 jobs 表。");
    } catch (e: any) {
        console.error(e);
        alert("同步失败: " + e.message);
    }
  };

  const filteredJobsBySearch = useMemo(() => {
      if (!searchTerm) return jobs;
      const term = searchTerm.toLowerCase();
      return jobs.filter(job => 
         (job.company?.toLowerCase() || '').includes(term) ||
         (job.position?.toLowerCase() || '').includes(term) ||
         (job.department?.toLowerCase() || '').includes(term) ||
         (job.email?.toLowerCase() || '').includes(term) ||
         (job.email_subject?.toLowerCase() || '').includes(term) ||
         (job.source?.toLowerCase() || '').includes(term) ||
         String(job.seq_id || '').includes(term)
      );
  }, [jobs, searchTerm]);

  const pendingJobs = filteredJobsBySearch.filter(j => 
    j.status === 'pending' || j.status === 'sending' || j.status === 'error'
  );
  const sentJobs = filteredJobsBySearch.filter(j => j.status === 'sent' || j.status === 'interview'); 
  const filteredJobs = filteredJobsBySearch.filter(j => j.status === 'filtered');

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">IF</div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">InternFlow AI</h1>
                    <p className="text-xs text-gray-500 font-medium">Supabase 集成版</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {authLoading ? (
                    <span className="text-xs text-gray-400">加载中...</span>
                ) : user ? (
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600 font-medium max-w-[150px] truncate">
                            {user.email}
                        </span>
                        <button onClick={() => supabase.auth.signOut()} className="text-xs text-red-500 hover:text-red-700 font-bold ml-2">退出</button>
                    </div>
                ) : (
                    <button onClick={() => setIsLoginModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition-colors shadow-sm">登录账户</button>
                )}
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <button onClick={() => setIsProfileModalOpen(true)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1"><span>⚙️</span> 设置</button>
                <ApiKeyInput onApiKeySet={setApiKey} />
            </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
         {!user && !authLoading ? (
             <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-sm border border-gray-200 mt-4 text-center p-8">
                 <h2 className="text-3xl font-bold text-gray-900 mb-4">智能求职，快人一步</h2>
                 <p className="text-gray-500 mb-8 max-w-md">基于 Gemini AI 的海量招聘信息解析工具，自动提取关键信息，一键生成个性化求职邮件。</p>
                 <button onClick={() => setIsLoginModalOpen(true)} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all hover:scale-105">立即登录 / 注册</button>
             </div>
         ) : (
             <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group">
                    <div className="flex justify-between items-center mb-2 px-1">
                        {/* 使用提取后的 SourceSelector，传递 state */}
                        <SourceSelector 
                            source={source} 
                            setSource={setSource}
                            isCustomSource={isCustomSource}
                            setIsCustomSource={setIsCustomSource}
                        />
                        <button onClick={() => setIsInputModalOpen(true)} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-md text-xs flex items-center gap-1 transition-colors">
                            <MaximizeIcon /> 全屏编辑
                        </button>
                    </div>

                    <textarea
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none font-mono h-48 transition-colors"
                        placeholder="在此粘贴招聘信息 (支持多条混排)..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isParsing}
                    />
                    
                    {isParsing ? (
                        <AIThinkingBox text={thinkingText} />
                    ) : (
                        <button
                            onClick={handleParse}
                            disabled={isParsing || !inputText.trim()}
                            className={`mt-3 w-full py-3 rounded-lg font-bold text-white shadow-md transition-all flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700`}
                        >
                            ✨ 开始智能解析
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[600px]">
                    <div className="flex border-b border-gray-200 bg-gray-50">
                        <button onClick={() => setActiveTab('pending')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>待投递 <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">{pendingJobs.length}</span></button>
                        <button onClick={() => setActiveTab('sent')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sent' ? 'border-green-600 text-green-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>已投递/进面 <span className="bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-xs">{sentJobs.length}</span></button>
                        <button onClick={() => setActiveTab('filtered')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'filtered' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>已过滤 <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">{filteredJobs.length}</span></button>
                        
                        <div className="flex-1 flex justify-end items-center px-4 gap-4">
                            <div className="relative">
                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 全局搜索..." className="pl-8 pr-3 py-1.5 text-xs bg-gray-100 border border-gray-200 rounded-full focus:bg-white focus:ring-2 focus:ring-indigo-200 outline-none w-64 transition-all"/>
                                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold">&times;</button>}
                            </div>
                            <button onClick={loadData} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1">🔄 刷新</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {activeTab === 'pending' && (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0 z-10 backdrop-blur-sm">
                                        <th className="p-4 w-10 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={pendingJobs.length > 0 && pendingJobs.every(j => j.selected)} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"/></th>
                                        <th className="p-4 w-14 text-center">序号</th>
                                        <th className="p-4 min-w-[200px]">信息摘要</th>
                                        <th className="p-4 w-32">来源 (可编辑)</th>
                                        <th className="p-4 min-w-[180px] max-w-[250px]">邮箱</th>
                                        <th className="p-4 min-w-[200px]">标题</th>
                                        <th className="p-4 w-24 text-center">状态</th>
                                        <th className="p-4 w-24 text-right">详情</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm bg-white">
                                    {pendingJobs.map(job => (
                                        <JobEntryRow 
                                            key={job.id} 
                                            job={job} 
                                            userProfile={userProfile}
                                            onUpdate={handleFullUpdateJob}
                                            onDelete={deleteJob}
                                            onToggleSelect={toggleSelect}
                                            onPreview={setPreviewJob}
                                            isDuplicate={checkIsDuplicate(job.email)}
                                        />
                                    ))}
                                    {pendingJobs.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-gray-400">{searchTerm ? '未找到匹配记录' : '暂无数据'}</td></tr>}
                                </tbody>
                            </table>
                        )}
                        {/* ... (其他 Tab 的代码保持不变) ... */}
                        {activeTab === 'sent' && (
                            <table className="w-full text-left border-collapse bg-green-50/10">
                                <thead>
                                    <tr className="bg-green-50 border-b border-green-100 text-xs font-bold uppercase tracking-wider text-green-800">
                                        <th className="p-4 w-14 text-center">序号</th>
                                        <th className="p-4 min-w-[180px]">公司</th>
                                        <th className="p-4 min-w-[180px]">岗位 / 部门</th>
                                        <th className="p-4 w-32">来源</th>
                                        <th className="p-4 w-32">投递时间</th>
                                        <th className="p-4 w-24 text-center">状态</th>
                                        <th className="p-4 min-w-[150px] text-right">后续操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-green-100 text-sm">
                                    {sentJobs.map(job => (
                                        <tr key={job.id} className="hover:bg-green-50/30">
                                            <td className="p-4 font-mono text-gray-500 text-xs text-center align-middle">{job.seq_id}</td>
                                            <td className="p-4 font-bold text-gray-800 align-middle">{job.company}{checkIsDuplicate(job.email) && <DuplicateBadge />}</td>
                                            <td className="p-4 align-middle"><div className="text-gray-900 font-medium">{job.position}</div>{job.department && <div className="text-xs text-gray-500">{job.department}</div>}</td>
                                            <td className="p-4 align-middle"><span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full border border-gray-200 whitespace-nowrap">{job.source || "未知"}</span></td>
                                            <td className="p-4 text-gray-500 text-xs align-middle">{new Date(job.created_at || Date.now()).toLocaleDateString()}</td>
                                            <td className="p-4 text-center align-middle"><span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${job.status === 'interview' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' : 'bg-green-100 text-green-700 ring-1 ring-green-200'}`}>{job.status === 'interview' ? '📅 已进面' : '📨 已投递'}</span></td>
                                            <td className="p-4 text-right space-x-3 align-middle">
                                                <button onClick={() => setPreviewJob(job)} className="text-gray-500 hover:text-indigo-600 text-xs underline">查看邮件</button>
                                                {job.status !== 'interview' && <button onClick={() => handleAddToInterview(job)} className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-700 shadow-sm transition-all inline-flex items-center gap-1">🚀 同步</button>}
                                                {job.status === 'interview' && <span className="text-xs text-gray-400 italic cursor-default">已在 JobFlow</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {sentJobs.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-gray-400">{searchTerm ? '未找到匹配记录' : '暂无投递记录'}</td></tr>}
                                </tbody>
                            </table>
                        )}
                        {activeTab === 'filtered' && (
                            <table className="w-full text-left border-collapse bg-red-50/10">
                                <thead>
                                    <tr className="bg-red-50 border-b border-red-100 text-xs font-bold uppercase tracking-wider text-red-800">
                                        <th className="p-4 w-10 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={filteredJobs.length > 0 && filteredJobs.every(j => j.selected)} className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"/></th>
                                        <th className="p-4 w-14 text-center">序号</th>
                                        <th className="p-4 min-w-[180px]">公司 / 岗位</th>
                                        <th className="p-4 w-32">来源</th>
                                        <th className="p-4">过滤原因 (AI判定)</th>
                                        <th className="p-4 w-32 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100 text-sm">
                                    {filteredJobs.map(job => (
                                        <tr key={job.id} className="hover:bg-red-50/30">
                                            <td className="p-4 text-center align-middle"><input type="checkbox" checked={job.selected || false} onChange={() => toggleSelect(job.id)} className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"/></td>
                                            <td className="p-4 font-mono text-gray-500 text-xs text-center align-middle">{job.seq_id}</td>
                                            <td className="p-4 align-middle"><div className="font-bold text-gray-800">{job.company}{checkIsDuplicate(job.email) && <DuplicateBadge />}</div><div className="text-gray-600 text-xs">{job.position}</div></td>
                                            <td className="p-4 align-middle"><span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full border border-gray-200 whitespace-nowrap">{job.source || "未知"}</span></td>
                                            <td className="p-4 align-middle"><span className="text-red-600 font-medium">{job.filter_reason || "不符合筛选条件"}</span></td>
                                            <td className="p-4 text-right space-x-2 align-middle">
                                                 <button onClick={async () => { await updateJobStatus(job.id, 'pending'); handleFullUpdateJob(job.id, { pass_filter: true, selected: true, status: 'pending' }); }} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-600">恢复</button>
                                                 <button onClick={() => deleteJob(job.id)} className="text-xs text-red-400 hover:text-red-600">删除</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredJobs.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-gray-400">{searchTerm ? '未找到匹配记录' : '没有被过滤的记录'}</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {activeTab === 'pending' && (
                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                             <div className="text-sm text-gray-500">已选 {pendingJobs.filter(j => j.selected).length} 项</div>
                             <div className="flex gap-3">
                                 <button 
                                    onClick={handleBatchDelete}
                                    disabled={!pendingJobs.some(j => j.selected)}
                                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                 >
                                    批量删除
                                 </button>
                                 <button onClick={handleBatchSend} disabled={isSending || !pendingJobs.some(j => j.selected)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all">
                                    {isSending ? `发送中... ${Math.round(sendProgress)}%` : '批量发送 (SMTP)'}
                                 </button>
                             </div>
                        </div>
                    )}
                    
                    {activeTab === 'filtered' && (
                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                             <div className="text-sm text-gray-500">已选 {filteredJobs.filter(j => j.selected).length} 项</div>
                             <button 
                                onClick={handleBatchDelete}
                                disabled={!filteredJobs.some(j => j.selected)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                             >
                                清空选中的记录
                             </button>
                        </div>
                    )}
                </div>
             </>
         )}
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      {isInputModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">📝 全屏输入模式</h3>
                        <button onClick={() => setIsInputModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                    </div>
                    <div className="flex-1 p-0 relative">
                        <textarea className="w-full h-full p-6 text-sm font-mono leading-relaxed resize-none focus:outline-none" placeholder="请粘贴大量招聘信息..." value={inputText} onChange={(e) => setInputText(e.target.value)} autoFocus />
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={() => setIsInputModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white">关闭</button>
                        <button onClick={handleParse} disabled={!inputText.trim()} className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:bg-gray-400">确认并解析 🚀</button>
                    </div>
                </div>
            </div>
      )}
      {previewJob && <EmailPreviewModal job={previewJob} onClose={() => setPreviewJob(null)} onUpdate={handleFullUpdateJob} onSendSingle={(overrideJob) => handleSendEmail(previewJob.id, overrideJob)} />}
      {isProfileModalOpen && <UserProfileModal currentProfile={userProfile} onSave={setUserProfile} onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default App;