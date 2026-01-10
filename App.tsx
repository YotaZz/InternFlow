// App.tsx
import React, { useState } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
import JobEntryRow from './components/JobEntryRow';
import EmailPreviewModal from './components/EmailPreviewModal';
import UserProfileModal from './components/UserProfileModal';
import { parseRecruitmentText } from './services/geminiService';
import { JobApplication, ProfileType, ParsingResult, UserProfile } from './types';
import { DEFAULT_USER_PROFILE } from './constants';

const generateId = () => Math.random().toString(36).substring(2, 9);

// [新增] 简单的全屏图标组件
const MaximizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>
);

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // [修改] 状态改为控制弹窗显示
  const [isInputModalOpen, setIsInputModalOpen] = useState(false); 
  const [activeTab, setActiveTab] = useState<'passed' | 'filtered'>('passed');

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
    if (previewJob?.id === id) setPreviewJob(null);
  };
  const toggleSelect = (id: string) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, selected: !job.selected } : job));
  };
  const toggleSelectAll = () => {
    const passedJobs = jobs.filter(j => j.pass_filter);
    const allSelected = passedJobs.length > 0 && passedJobs.every(j => j.selected);
    setJobs(prev => prev.map(j => {
        if (j.pass_filter) return { ...j, selected: !allSelected };
        return j;
    }));
  };

  const updateJob = (id: string, updates: Partial<JobApplication>) => {
    setJobs(prev => {
        const newJobs = prev.map(job => job.id === id ? { ...job, ...updates } : job);
        if (previewJob && previewJob.id === id) {
            setPreviewJob({ ...previewJob, ...updates });
        }
        return newJobs;
    });
  };

  const handleParse = async () => {
    if (!apiKey) {
      alert("请先配置 API Key");
      return;
    }
    if (!inputText.trim()) return;

    // 解析开始时关闭输入弹窗
    setIsInputModalOpen(false);
    setIsParsing(true);
    
    try {
      const results: ParsingResult[] = await parseRecruitmentText(apiKey, inputText, userProfile);
      
      const newJobs: JobApplication[] = results.map(res => {
        return {
            id: generateId(),
            company: res.company,
            department: res.department, 
            position: res.position,
            email: res.email,
            profile_selected: res.profile_selected as ProfileType,
            email_subject: res.email_subject,
            filename: `${res.email_subject}.pdf`, 
            opening_line: res.opening_line,
            job_source_line: res.job_source_line,
            praise_line: res.praise_line,
            needs_review: res.needs_review,
            review_reason: res.review_reason,
            pass_filter: res.pass_filter,
            filter_reason: res.filter_reason,
            raw_requirement: inputText,
            selected: res.pass_filter,
            status: 'pending',
            logs: []
        };
      });

      setJobs(prev => [...prev, ...newJobs]);
      setInputText(''); 
      setActiveTab('passed');
    } catch (error) {
      console.error(error);
      alert("解析失败，请检查控制台或重试。");
    } finally {
      setIsParsing(false);
    }
  };
  
  const handleBatchSend = () => {
    const jobsToSend = jobs.filter(j => j.pass_filter && j.selected && j.status !== 'sent');
    if (jobsToSend.length === 0) return;

    if (!userProfile.senderEmail && !userProfile.smtpUser) {
        console.warn("未配置 Reply-To 或 Sender，可能会使用默认值");
    }

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
        if (previewJob && previewJob.id === jobId) {
             setPreviewJob(prev => prev ? { ...prev, logs: [...(prev.logs || []), logLine] } : null);
        }
    };

    updateJob(jobId, { status: 'sending', logs: [] });
    addLog(`Preparing to send to ${job.email}...`);

    try {
        let mailBody = userProfile.bodyTemplate || "";
        
        mailBody = mailBody.replace(/{{opening_line}}/g, job.opening_line);
        mailBody = mailBody.replace(/{{job_source_line}}/g, job.job_source_line);
        mailBody = mailBody.replace(/{{praise_line}}/g, job.praise_line);
        mailBody = mailBody.replace(/{{company}}/g, job.company);
        
        mailBody = mailBody.replace(/{{name}}/g, userProfile.name);
        mailBody = mailBody.replace(/{{undergrad}}/g, userProfile.undergrad);
        mailBody = mailBody.replace(/{{undergradMajor}}/g, userProfile.undergradMajor);
        
        mailBody = mailBody.replace(/{{availability}}/g, userProfile.availability);
        mailBody = mailBody.replace(/{{frequency}}/g, userProfile.frequency);
        mailBody = mailBody.replace(/{{arrival}}/g, userProfile.arrival);
        mailBody = mailBody.replace(/{{currentGrade}}/g, userProfile.currentGrade || '');
        
        const masterInfo = userProfile.master 
            ? `硕士就读于${userProfile.master}${userProfile.masterMajor ? `(${userProfile.masterMajor})` : ''}，` 
            : "";
        mailBody = mailBody.replace(/{{master_info}}/g, masterInfo);

        const response = await fetch('/api/send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: job.email,
                subject: job.email_subject,
                html: mailBody,
                replyTo: userProfile.senderEmail,
                fromName: userProfile.name,
                smtpUser: userProfile.smtpUser,
                smtpPass: userProfile.smtpPass
            })
        });

        const data = await response.json();

        if (response.ok) {
            addLog(`Success! ID: ${data.messageId}`);
            updateJob(jobId, { status: 'sent' });
        } else {
            addLog(`Failed: ${data.error}`);
            updateJob(jobId, { status: 'error' });
        }
    } catch (error: any) {
        console.error("API Error:", error);
        addLog(`Error: ${error.message || 'Network error'}`);
        updateJob(jobId, { status: 'error' });
    }
  };

  const passedJobs = jobs.filter(j => j.pass_filter);
  const filteredJobs = jobs.filter(j => !j.pass_filter);

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 bg-gray-100">
      <ApiKeyInput onApiKeySet={setApiKey} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">IF</div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">InternFlow AI</h1>
                    <p className="text-xs text-gray-500 font-medium">智能简历投递系统 V3.5 (UI优化版)</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={() => setIsProfileModalOpen(true)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors">
                  ⚙️ 设置
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col gap-6">
        
        {/* [UI重构] 顶部：输入区域 - 移除繁琐标题栏，改为紧凑布局 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative group">
            {/* 全屏按钮：悬浮在右上角 */}
            <button 
                onClick={() => setIsInputModalOpen(true)}
                className="absolute top-6 right-6 p-2 bg-white/80 backdrop-blur text-gray-400 hover:text-indigo-600 border border-gray-200 rounded-lg shadow-sm transition-all z-10 hover:scale-105"
                title="全屏大窗口编辑"
            >
                <MaximizeIcon /> <span className="text-xs font-bold ml-1">全屏</span>
            </button>

            {/* 常驻输入框：高度设为 h-48 (之前展开的大小) */}
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
                       <span>AI 正在分析与筛选...</span>
                    </>
                ) : '✨ 开始智能解析'}
            </button>
        </div>

        {/* [新增] 输入全屏弹窗 Modal */}
        {isInputModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                            📝 全屏输入模式
                        </h3>
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
                        <button 
                            onClick={() => setIsInputModalOpen(false)}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white"
                        >
                            关闭 (仅保存)
                        </button>
                        <button 
                            onClick={handleParse}
                            disabled={!inputText.trim()}
                            className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg disabled:bg-gray-400"
                        >
                            确认并解析 🚀
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 底部：结果区域 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[600px]">
            <div className="flex border-b border-gray-200 bg-gray-50">
                <button 
                    onClick={() => setActiveTab('passed')}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'passed' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    待投递列表 <span className="bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full text-xs">{passedJobs.length}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('filtered')}
                    className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'filtered' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    已过滤 (不匹配) <span className="bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-xs">{filteredJobs.length}</span>
                </button>
                <div className="flex-1 flex justify-end items-center px-4">
                     {jobs.length > 0 && <button onClick={() => setJobs([])} className="text-xs text-red-400 hover:text-red-600">清空所有记录</button>}
                </div>
            </div>

            <div className="flex-1 overflow-x-auto">
                {activeTab === 'passed' ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 w-12 text-center">
                                    <input type="checkbox" onChange={toggleSelectAll} checked={passedJobs.length > 0 && passedJobs.every(j => j.selected)} className="w-4 h-4"/>
                                </th>
                                <th className="p-4">信息摘要</th>
                                <th className="p-4">邮箱</th>
                                <th className="p-4">身份</th>
                                <th className="p-4">标题</th>
                                <th className="p-4">状态</th>
                                <th className="p-4 text-right">详情</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {passedJobs.map(job => (
                                <JobEntryRow 
                                    key={job.id} 
                                    job={job} 
				                    userProfile={userProfile}
                                    onUpdate={updateJob}
                                    onDelete={deleteJob}
                                    onToggleSelect={toggleSelect}
                                    onPreview={setPreviewJob}
                                />
                            ))}
                            {passedJobs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">暂无待投递的岗位</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left border-collapse bg-red-50/10">
                         <thead>
                            <tr className="bg-red-50 border-b border-red-100 text-xs uppercase tracking-wider text-red-800">
                                <th className="p-4">岗位信息</th>
                                <th className="p-4">过滤原因 (AI判定)</th>
                                <th className="p-4 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100 text-sm">
                            {filteredJobs.map(job => (
                                <tr key={job.id} className="hover:bg-red-50/30">
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{job.company}</div>
                                        <div className="text-gray-600">{job.position}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-red-600 font-medium">{job.filter_reason || "不符合筛选条件"}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                         <button 
                                            onClick={() => updateJob(job.id, { pass_filter: true, selected: true })}
                                            className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-600 mr-2"
                                         >
                                            恢复到待投递
                                         </button>
                                         <button 
                                            onClick={() => deleteJob(job.id)} 
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            彻底删除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredJobs.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-400">没有被过滤的岗位</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {activeTab === 'passed' && (
                <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-500">已选 {passedJobs.filter(j => j.selected).length} 项</div>
                        {!isSending && (
                        <button onClick={handleBatchSend} disabled={!passedJobs.some(j => j.selected)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold disabled:bg-gray-300 shadow-md hover:bg-green-700 transition-colors">
                                批量发送 (SMTP)
                        </button>
                        )}
                </div>
            )}
        </div>
      </main>

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