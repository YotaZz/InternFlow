import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';

// 组件导入
import ApiKeyInput from './components/ApiKeyInput';
import JobEntryRow from './components/JobEntryRow';
import EmailPreviewModal from './components/EmailPreviewModal';
import UserProfileModal from './components/UserProfileModal';
import { LoginModal } from './components/LoginModal'; // 从 JobFlow 复制过来的组件

// 服务导入
import { parseRecruitmentText } from './services/geminiService';
import { fetchJobs, saveParsedJobs, updateJobStatus, syncToInterviewManager } from './services/jobService';

// 类型与常量
import { JobApplication, ParsingResult, UserProfile } from './types';
import { DEFAULT_USER_PROFILE } from './constants';

// 简单的全屏图标组件
const MaximizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>
);

const App: React.FC = () => {
  // --- 状态管理 ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [apiKey, setApiKey] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false); 
  
  const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'filtered'>('pending');
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // --- 初始化与 Auth 监听 ---
  useEffect(() => {
    const initAuth = async () => {
      // 1. 获取当前 Session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setAuthLoading(false);
      
      if (session?.user) {
        loadData(); // 登录状态下加载数据
      }
    };

    initAuth();

    // 2. 监听登录/登出变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        loadData();
      } else {
        setJobs([]); // 登出清空数据
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 核心功能函数 ---

  // 加载数据
  const loadData = async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
    } catch (error) {
      console.error("加载数据失败:", error);
    }
  };

  // 本地更新 (Optimistic UI)
  const updateJobLocal = (id: string, updates: Partial<JobApplication>) => {
    setJobs(prev => {
        const newJobs = prev.map(job => job.id === id ? { ...job, ...updates } : job);
        if (previewJob && previewJob.id === id) {
            setPreviewJob({ ...previewJob, ...updates });
        }
        return newJobs;
    });
  };

  const deleteJob = (id: string) => {
    // 仅前端移除，如果需要删库请在 service 实现 deleteJob
    setJobs(prev => prev.filter(job => job.id !== id));
    if (previewJob?.id === id) setPreviewJob(null);
  };

  const toggleSelect = (id: string) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, selected: !job.selected } : job));
  };

  const toggleSelectAll = () => {
    const currentJobs = jobs.filter(j => j.status === activeTab);
    const allSelected = currentJobs.length > 0 && currentJobs.every(j => j.selected);
    
    setJobs(prev => prev.map(j => {
        if (j.status === activeTab) return { ...j, selected: !allSelected };
        return j;
    }));
  };

  // 解析简历
  const handleParse = async () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!apiKey) {
      alert("请先配置 API Key");
      return;
    }
    if (!inputText.trim()) return;

    setIsInputModalOpen(false);
    setIsParsing(true);
    
    try {
      // 调用 Gemini 解析
      const results: ParsingResult[] = await parseRecruitmentText(apiKey, inputText, userProfile);
      
      // 存入 Supabase (自动关联当前 user.id)
      await saveParsedJobs(results, inputText);
      
      // 刷新列表
      await loadData();

      setInputText(''); 
      setActiveTab('pending');
    } catch (error) {
      console.error(error);
      alert("解析或保存失败，请检查网络或控制台日志。");
    } finally {
      setIsParsing(false);
    }
  };
  
  // 批量发送
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
        }, index * 10000); // 间隔 10秒防止封号
    });
  };

  // 单个发送邮件
  const handleSendEmail = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const logLine = `[${time}] ${msg}`;
        setJobs(prev => prev.map(j => {
            if (j.id === jobId) return { ...j, logs: [...(j.logs || []), logLine] };
            return j;
        }));
    };

    // UI 状态改为 sending
    updateJobLocal(jobId, { status: 'sending' as any }); // casting for temporary UI state
    addLog(`正在发送给 ${job.email}...`);

    try {
        // 构建邮件内容
        let mailBody = userProfile.bodyTemplate || "";
        // ... (模板替换逻辑，保持原有代码一致) ...
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

        // 调用 API
        const response = await fetch('/api/send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: job.email,
                subject: job.email_subject,
                html: mailBody,
                replyTo: userProfile.senderEmail || user?.email, // 优先用配置的，否则用账户邮箱
                fromName: userProfile.name,
                smtpUser: userProfile.smtpUser,
                smtpPass: userProfile.smtpPass
            })
        });

        const data = await response.json();

        if (response.ok) {
            addLog(`发送成功! ID: ${data.messageId}`);
            // 数据库更新状态为 sent
            await updateJobStatus(jobId, 'sent');
            // 本地刷新
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

  // 【核心需求】同步到面试管理
  const handleAddToInterview = async (job: JobApplication) => {
    if (!user) {
        setIsLoginModalOpen(true);
        return;
    }

    // 预计算岗位名称以展示给用户确认
    const targetPositionName = job.department ? `${job.department}-${job.position}` : job.position;

    if (!confirm(`确认将【${job.company}】加入面试进度表吗？\n\n即将创建的记录：\n岗位：${targetPositionName}\n类型：实习`)) {
        return;
    }
    
    try {
        await syncToInterviewManager(job);
        // 更新本地状态为 'interview'
        updateJobLocal(job.id, { status: 'interview' });
        alert("✅ 同步成功！数据已写入 jobs 表。");
    } catch (e: any) {
        console.error(e);
        alert("同步失败: " + e.message);
    }
  };

  // 筛选列表
  const pendingJobs = jobs.filter(j => j.status === 'pending');
  // 已投递包含 'sent' 和 'interview' (已进面)
  const sentJobs = jobs.filter(j => j.status === 'sent' || j.status === 'interview'); 
  const filteredJobs = jobs.filter(j => j.status === 'filtered');

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-100">
      
      {/* 1. Header */}
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
                {/* 身份状态显示 */}
                {authLoading ? (
                    <span className="text-xs text-gray-400">加载中...</span>
                ) : user ? (
                    <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-600 font-medium max-w-[150px] truncate">
                            {user.email}
                        </span>
                        <button 
                            onClick={() => supabase.auth.signOut()}
                            className="text-xs text-red-500 hover:text-red-700 font-bold ml-2"
                        >
                            退出
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsLoginModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        登录账户
                    </button>
                )}

                <div className="h-6 w-px bg-gray-200 mx-2"></div>

                <button onClick={() => setIsProfileModalOpen(true)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors flex items-center gap-1">
                  <span>⚙️</span> 设置
                </button>
                
                <ApiKeyInput onApiKeySet={setApiKey} />
            </div>
        </div>
      </header>
      
      {/* 2. Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
         
         {/* 未登录时的引导页 */}
         {!user && !authLoading ? (
             <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-xl shadow-sm border border-gray-200 mt-4 text-center p-8">
                 <div className="bg-indigo-100 p-4 rounded-full mb-6">
                    <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.131A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.2-2.858.567-4.181m-3.23 12.166A21.923 21.923 0 005 15.364"/></svg>
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 mb-3">欢迎使用 InternFlow AI</h2>
                 <p className="text-gray-500 mb-8 max-w-md">
                    请先登录您的 JobFlow 账户。系统将自动同步您的投递记录，并在您获得面试机会时一键更新至面试进度表。
                 </p>
                 <button 
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-all hover:scale-105"
                 >
                    立即登录 / 注册
                 </button>
             </div>
         ) : (
             <>
                {/* 登录后显示的 Input 区域 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group">
                    <button 
                        onClick={() => setIsInputModalOpen(true)}
                        className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur text-gray-400 hover:text-indigo-600 border border-gray-200 rounded-lg shadow-sm transition-all z-10 hover:scale-105"
                        title="全屏大窗口编辑"
                    >
                        <MaximizeIcon /> <span className="text-xs font-bold ml-1">全屏</span>
                    </button>

                    <textarea
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none font-mono h-48 transition-colors"
                        placeholder="在此粘贴招聘信息 (支持多条混排)..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isParsing}
                    />
                    
                    <button
                        onClick={handleParse}
                        disabled={isParsing || !inputText.trim()}
                        className={`mt-3 w-full py-3 rounded-lg font-bold text-white shadow-md transition-all flex justify-center items-center gap-2 ${isParsing ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {isParsing ? (
                            <>
                               <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                               <span>AI 正在分析并入库...</span>
                            </>
                        ) : '✨ 开始智能解析'}
                    </button>
                </div>

                {/* 列表区域 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[600px]">
                    <div className="flex border-b border-gray-200 bg-gray-50">
                        <button 
                            onClick={() => setActiveTab('pending')}
                            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            待投递 <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">{pendingJobs.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('sent')}
                            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sent' ? 'border-green-600 text-green-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            已投递/进面 <span className="bg-green-100 text-green-700 py-0.5 px-2 rounded-full text-xs">{sentJobs.length}</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('filtered')}
                            className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'filtered' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            已过滤 <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">{filteredJobs.length}</span>
                        </button>
                        <div className="flex-1 flex justify-end items-center px-4">
                            <button onClick={loadData} className="text-xs text-gray-500 hover:text-indigo-600 mr-2 flex items-center gap-1">
                                🔄 刷新数据
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {/* 待投递列表 */}
                        {activeTab === 'pending' && (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                        <th className="p-4 w-12 text-center">
                                            <input type="checkbox" onChange={toggleSelectAll} checked={pendingJobs.length > 0 && pendingJobs.every(j => j.selected)} className="w-4 h-4"/>
                                        </th>
                                        <th className="p-4">信息摘要</th>
                                        <th className="p-4">邮箱</th>
                                        <th className="p-4">标题</th>
                                        <th className="p-4">状态</th>
                                        <th className="p-4 text-right">详情</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {pendingJobs.map(job => (
                                        <JobEntryRow 
                                            key={job.id} 
                                            job={job} 
                                            userProfile={userProfile}
                                            onUpdate={(id, updates) => updateJobLocal(id, updates)}
                                            onDelete={deleteJob}
                                            onToggleSelect={toggleSelect}
                                            onPreview={setPreviewJob}
                                        />
                                    ))}
                                    {pendingJobs.length === 0 && (
                                        <tr><td colSpan={7} className="p-8 text-center text-gray-400">暂无数据</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 已投递列表 (特殊渲染，包含同步按钮) */}
                        {activeTab === 'sent' && (
                            <table className="w-full text-left border-collapse bg-green-50/10">
                                <thead>
                                    <tr className="bg-green-50 border-b border-green-100 text-xs uppercase tracking-wider text-green-800">
                                        <th className="p-4">公司</th>
                                        <th className="p-4">岗位 / 部门</th>
                                        <th className="p-4">投递时间</th>
                                        <th className="p-4">状态</th>
                                        <th className="p-4 text-right">后续操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-green-100 text-sm">
                                    {sentJobs.map(job => (
                                        <tr key={job.id} className="hover:bg-green-50/30">
                                            <td className="p-4 font-bold text-gray-800">{job.company}</td>
                                            <td className="p-4">
                                                <div className="text-gray-900 font-medium">{job.position}</div>
                                                {job.department && <div className="text-xs text-gray-500">{job.department}</div>}
                                            </td>
                                            <td className="p-4 text-gray-500 text-xs">
                                                {new Date(job.created_at || Date.now()).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    job.status === 'interview' ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' : 'bg-green-100 text-green-700 ring-1 ring-green-200'
                                                }`}>
                                                    {job.status === 'interview' ? '📅 已进面' : '📨 已投递'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-3">
                                                <button onClick={() => setPreviewJob(job)} className="text-gray-500 hover:text-indigo-600 text-xs underline">
                                                    查看邮件
                                                </button>
                                                
                                                {job.status !== 'interview' && (
                                                    <button 
                                                        onClick={() => handleAddToInterview(job)}
                                                        className="bg-purple-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-purple-700 shadow-sm transition-all flex items-center gap-1 inline-flex"
                                                    >
                                                        🚀 同步至面试表
                                                    </button>
                                                )}
                                                
                                                {job.status === 'interview' && (
                                                    <span className="text-xs text-gray-400 italic cursor-default">
                                                        已在 JobFlow 中
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {sentJobs.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无投递记录</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* 已过滤列表 */}
                        {activeTab === 'filtered' && (
                            <table className="w-full text-left border-collapse bg-red-50/10">
                                <thead>
                                    <tr className="bg-red-50 border-b border-red-100 text-xs uppercase tracking-wider text-red-800">
                                        <th className="p-4">公司 / 岗位</th>
                                        <th className="p-4">过滤原因 (AI判定)</th>
                                        <th className="p-4 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-red-100 text-sm">
                                    {filteredJobs.map(job => (
                                        <tr key={job.id} className="hover:bg-red-50/30">
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{job.company}</div>
                                                <div className="text-gray-600 text-xs">{job.position}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-red-600 font-medium">{job.filter_reason || "不符合筛选条件"}</span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                 <button 
                                                    onClick={async () => {
                                                        // 恢复操作
                                                        await updateJobStatus(job.id, 'pending');
                                                        updateJobLocal(job.id, { pass_filter: true, selected: true, status: 'pending' });
                                                    }}
                                                    className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-600"
                                                 >
                                                    恢复
                                                 </button>
                                                 <button onClick={() => deleteJob(job.id)} className="text-xs text-red-400 hover:text-red-600">
                                                    删除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredJobs.length === 0 && (
                                        <tr><td colSpan={3} className="p-8 text-center text-gray-400">没有被过滤的记录</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* 底部操作栏 (仅待投递可见) */}
                    {activeTab === 'pending' && (
                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                             <div className="text-sm text-gray-500">已选 {pendingJobs.filter(j => j.selected).length} 项</div>
                             <button 
                                onClick={handleBatchSend} 
                                disabled={isSending || !pendingJobs.some(j => j.selected)} 
                                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                            >
                                {isSending ? `发送中... ${Math.round(sendProgress)}%` : '批量发送 (SMTP)'}
                             </button>
                        </div>
                    )}
                </div>
             </>
         )}
      </main>

      {/* 3. 全局弹窗 */}
      
      {/* 登录弹窗 (直接复用 JobFlow 的) */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
      
      {/* 输入框全屏 Modal */}
      {isInputModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">📝 全屏输入模式</h3>
                        <button onClick={() => setIsInputModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                    </div>
                    <div className="flex-1 p-0 relative">
                        <textarea
                            className="w-full h-full p-6 text-sm font-mono leading-relaxed resize-none focus:outline-none"
                            placeholder="请粘贴大量招聘文本..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={() => setIsInputModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white">关闭</button>
                        <button onClick={handleParse} disabled={!inputText.trim()} className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:bg-gray-400">确认并解析 🚀</button>
                    </div>
                </div>
            </div>
      )}

      {/* 邮件预览 Modal */}
      {previewJob && (
        <EmailPreviewModal 
            job={previewJob} 
            onClose={() => setPreviewJob(null)} 
            onSendSingle={() => handleSendEmail(previewJob.id)}
            onUpdate={(id, updates) => updateJobLocal(id, updates)}
        />
      )}
      
      {/* 设置 Modal */}
      {isProfileModalOpen && (
        <UserProfileModal 
            currentProfile={userProfile} 
            onSave={setUserProfile} 
            onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;