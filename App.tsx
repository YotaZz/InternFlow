import React, { useState } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
import JobEntryRow from './components/JobEntryRow';
import EmailPreviewModal from './components/EmailPreviewModal';
import UserProfileModal from './components/UserProfileModal';
import { parseRecruitmentText } from './services/geminiService';
import { JobApplication, ProfileType, ParsingResult, UserProfile } from './types';
import { DEFAULT_USER_PROFILE } from './constants';
import emailjs from '@emailjs/browser';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 9);

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  
  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Mock sending progress
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  const handleParse = async () => {
    if (!apiKey) {
      alert("请先配置 API Key");
      return;
    }
    if (!inputText.trim()) return;

    setIsParsing(true);
    try {
      // Pass the current user profile to the service
      const results: ParsingResult[] = await parseRecruitmentText(apiKey, inputText, userProfile);
      
      const newJobs: JobApplication[] = results.map(res => ({
        id: generateId(),
        company: res.company,
        department: res.department, 
        position: res.position,
        email: res.email,
        profile_selected: res.profile_selected as ProfileType,
        email_subject: res.email_subject,
        filename: res.filename,
        email_body: res.email_body,
        raw_requirement: inputText,
        selected: true,
        status: 'pending',
        logs: []
      }));

      setJobs(prev => [...prev, ...newJobs]);
      setInputText(''); 
    } catch (error) {
      console.error(error);
      alert("解析失败，请检查控制台或重试。");
    } finally {
      setIsParsing(false);
    }
  };

  const updateJob = (id: string, updates: Partial<JobApplication>) => {
    setJobs(prev => {
        const newJobs = prev.map(job => job.id === id ? { ...job, ...updates } : job);
        // Also update previewJob if it's the one being modified
        if (previewJob && previewJob.id === id) {
            setPreviewJob({ ...previewJob, ...updates });
        }
        return newJobs;
    });
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
    if (previewJob?.id === id) setPreviewJob(null);
  };

  const toggleSelect = (id: string) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, selected: !job.selected } : job));
  };

  const toggleSelectAll = () => {
    const allSelected = jobs.every(j => j.selected);
    setJobs(prev => prev.map(j => ({ ...j, selected: !allSelected })));
  };

  const handleBatchSend = () => {
    const jobsToSend = jobs.filter(j => j.selected && j.status !== 'sent');
    if (jobsToSend.length === 0) return;

    if (!userProfile.emailjsServiceId || !userProfile.emailjsPublicKey || !userProfile.emailjsTemplateId) {
        alert("请先在设置中配置 EmailJS 参数");
        setIsProfileModalOpen(true);
        return;
    }

    setIsSending(true);
    setSendProgress(0);

    // Process each job sequentially for batch simulation
    let processedCount = 0;
    
    // We simulate batch by triggering individual sends with delay
    jobsToSend.forEach((job, index) => {
        setTimeout(() => {
            handleSendEmail(job.id);
            processedCount++;
            setSendProgress((processedCount / jobsToSend.length) * 100);
            
            if (processedCount === jobsToSend.length) {
                setTimeout(() => setIsSending(false), 2000);
            }
        }, index * 2000); // 2 seconds apart to avoid rate limits
    });
  };

  const handleSendEmail = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
        const logLine = `[${time}] ${msg}`;
        setJobs(prev => prev.map(j => {
            if (j.id === jobId) {
                return { ...j, logs: [...(j.logs || []), logLine] };
            }
            return j;
        }));
        
        // Update preview job if open
        setPreviewJob(prev => {
            if (prev && prev.id === jobId) {
                return { ...prev, logs: [...(prev.logs || []), logLine] };
            }
            return prev;
        });
    };

    if (!userProfile.emailjsServiceId || !userProfile.emailjsPublicKey || !userProfile.emailjsTemplateId) {
        addLog("Error: EmailJS config missing.");
        updateJob(jobId, { status: 'error' });
        return;
    }

    updateJob(jobId, { status: 'sending', logs: [] });
    addLog(`Initializing EmailJS send to ${job.email}...`);

    try {
        const templateParams = {
            to_name: job.company,    // 对应 EmailJS 模板 {{to_name}}
            to_email: job.email,     // 对应 EmailJS 模板 {{to_email}}
            subject: job.email_subject, // 对应 EmailJS 模板 {{subject}}
            message: job.email_body,    // 对应 EmailJS 模板 {{message}}
            from_name: userProfile.name, // 对应 EmailJS 模板 {{from_name}}
            reply_to: userProfile.senderEmail // 对应 EmailJS 模板 {{reply_to}}
        };

        const response = await emailjs.send(
            userProfile.emailjsServiceId,
            userProfile.emailjsTemplateId,
            templateParams,
            userProfile.emailjsPublicKey
        );

        if (response.status === 200) {
            addLog(`Success! ID: ${response.text}`);
            updateJob(jobId, { status: 'sent' });
        } else {
            addLog(`Failed with status: ${response.status}`);
            updateJob(jobId, { status: 'error' });
        }
    } catch (error: any) {
        console.error("EmailJS Error:", error);
        addLog(`Error: ${error.text || error.message || 'Unknown error'}`);
        updateJob(jobId, { status: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <ApiKeyInput onApiKeySet={setApiKey} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    IF
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">InternFlow AI</h1>
                    <p className="text-xs text-gray-500 font-medium">智能简历投递系统 V3.0 (EmailJS版)</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold">{userProfile.name}</div>
                    <div className="text-xs text-gray-500">{userProfile.undergrad} {userProfile.master && `/ ${userProfile.master}`}</div>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
                >
                  ⚙️ 设置个人信息
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 gap-8 flex flex-col lg:flex-row">
        
        {/* Left Column: Input */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        非结构化输入
                    </h2>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-medium">AI 智能解析</span>
                </div>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                   直接粘贴微信聊天、Excel 或文档中的乱序招聘信息。AI 将自动提取关键信息并匹配您的最佳简历身份。
                </p>
                <textarea
                    className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition-all resize-none font-mono"
                    placeholder={`示例:\n腾讯 产品实习生 hr@tencent.com 邮件主题请注明：姓名-学校-毕业时间\n字节 数据分析 data@bytedance.com 要求27届，研一优先...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isParsing}
                />
                <button
                    onClick={handleParse}
                    disabled={isParsing || !inputText.trim()}
                    className={`mt-4 w-full py-3 rounded-lg font-semibold text-white shadow-md transition-all flex items-center justify-center gap-2
                        ${isParsing || !inputText.trim() ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:transform active:scale-95'}
                    `}
                >
                    {isParsing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            正在分析...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            智能识别
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* Right Column: Results */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full min-h-[500px]">
                {/* Toolbar */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="font-semibold text-gray-800">解析结果 ({jobs.length})</h2>
                    <div className="flex gap-2">
                        {jobs.length > 0 && (
                             <button onClick={() => setJobs([])} className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 hover:bg-red-50 rounded transition-colors">
                                清空列表
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Header */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 w-12 text-center">
                                    <input type="checkbox" onChange={toggleSelectAll} checked={jobs.length > 0 && jobs.every(j => j.selected)} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"/>
                                </th>
                                <th className="p-4">公司 / 部门 / 岗位</th>
                                <th className="p-4">投递邮箱</th>
                                <th className="p-4">AI 身份选择</th>
                                <th className="p-4 w-1/4">邮件标题 (点击可修改)</th>
                                <th className="p-4">状态</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                            <p>暂无数据。请在左侧粘贴文本开始解析。</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                jobs.map(job => (
                                    <JobEntryRow 
                                        key={job.id} 
                                        job={job} 
                                        onUpdate={updateJob}
                                        onDelete={deleteJob}
                                        onToggleSelect={toggleSelect}
                                        onPreview={setPreviewJob}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Action */}
                <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        已选 {jobs.filter(j => j.selected).length} 项
                    </div>
                    {isSending ? (
                         <div className="w-64 bg-gray-200 rounded-full h-2.5 dark:bg-gray-300 overflow-hidden">
                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${sendProgress}%` }}></div>
                         </div>
                    ) : (
                        <button 
                            onClick={handleBatchSend}
                            disabled={jobs.filter(j => j.selected).length === 0}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2"
                        >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                             EmailJS 批量发送
                        </button>
                    )}
                </div>
             </div>
        </div>
      </main>

      {/* Modals */}
      {previewJob && (
        <EmailPreviewModal 
            job={previewJob} 
            onClose={() => setPreviewJob(null)} 
            onSendSingle={() => handleSendEmail(previewJob.id)}
            onUpdate={updateJob}
        />
      )}
      
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