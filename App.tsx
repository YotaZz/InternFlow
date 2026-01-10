import React, { useState } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
import JobEntryRow from './components/JobEntryRow';
import EmailPreviewModal from './components/EmailPreviewModal';
import UserProfileModal from './components/UserProfileModal';
import { parseRecruitmentText } from './services/geminiService';
import { JobApplication, ProfileType, ParsingResult, UserProfile } from './types';
import { DEFAULT_USER_PROFILE } from './constants';

const generateId = () => Math.random().toString(36).substring(2, 9);

const App: React.FC = () => {
  // ... (状态定义保持不变)
  const [apiKey, setApiKey] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [previewJob, setPreviewJob] = useState<JobApplication | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // ... (handleParse, updateJob, deleteJob, toggleSelect... 保持不变)
  const handleParse = async () => {
    if (!apiKey) {
      alert("请先配置 API Key");
      return;
    }
    if (!inputText.trim()) return;

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
            raw_requirement: inputText,
            selected: true,
            status: 'pending',
            logs: []
        };
      });

      setJobs(prev => [...prev, ...newJobs]);
      setInputText(''); 
    } catch (error) {
      console.error(error);
      alert("解析失败，请检查控制台或重试。");
    } finally {
      setIsParsing(false);
    }
  };
  
  // 辅助函数：更新 Job
  const updateJob = (id: string, updates: Partial<JobApplication>) => {
    setJobs(prev => {
        const newJobs = prev.map(job => job.id === id ? { ...job, ...updates } : job);
        if (previewJob && previewJob.id === id) {
            setPreviewJob({ ...previewJob, ...updates });
        }
        return newJobs;
    });
  };
  // 辅助函数
  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(job => job.id !== id));
    if (previewJob?.id === id) setPreviewJob(null);
  };
  const toggleSelect = (id: string) => {
    setJobs(prev => prev.map(job => job.id === id ? { ...job, selected: !job.selected } : job));
  };
  const toggleSelectAll = () => {
    const allSelected = jobs.length > 0 && jobs.every(j => j.selected);
    setJobs(prev => prev.map(j => ({ ...j, selected: !allSelected })));
  };

  const handleBatchSend = () => {
    const jobsToSend = jobs.filter(j => j.selected && j.status !== 'sent');
    if (jobsToSend.length === 0) return;

    if (!userProfile.senderEmail) {
        alert("请先在设置中配置回复邮箱 (Sender Email)");
        setIsProfileModalOpen(true);
        return;
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
        }, index * 2000); // 间隔发送，防止触发垃圾邮件风控
    });
  };

  // [修改] 发送邮件逻辑：调用后端 API
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
    addLog(`Preparing to send via Nodemailer to ${job.email}...`);

    try {
        // 1. 构建邮件正文 (简单的模板替换)
        let mailBody = userProfile.bodyTemplate || "";
        
        // 替换 AI 生成的动态变量
        mailBody = mailBody.replace(/{{opening_line}}/g, job.opening_line);
        mailBody = mailBody.replace(/{{job_source_line}}/g, job.job_source_line);
        mailBody = mailBody.replace(/{{praise_line}}/g, job.praise_line);
        mailBody = mailBody.replace(/{{company}}/g, job.company);
        
        // 替换用户基础信息
        mailBody = mailBody.replace(/{{name}}/g, userProfile.name);
        mailBody = mailBody.replace(/{{undergrad}}/g, userProfile.undergrad);
        mailBody = mailBody.replace(/{{availability}}/g, userProfile.availability);
        mailBody = mailBody.replace(/{{frequency}}/g, userProfile.frequency);
        mailBody = mailBody.replace(/{{arrival}}/g, userProfile.arrival);
        mailBody = mailBody.replace(/{{currentGrade}}/g, userProfile.currentGrade || '');
        
        // 特殊逻辑：本硕信息拼接
        const masterInfo = userProfile.master 
            ? `硕士就读于${userProfile.master}${userProfile.masterMajor ? `(${userProfile.masterMajor})` : ''}，` 
            : "";
        mailBody = mailBody.replace(/{{master_info}}/g, masterInfo);

        // 2. 调用后端 API
        const response = await fetch('/api/send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: job.email,
                subject: job.email_subject,
                html: mailBody,
                replyTo: userProfile.senderEmail,
                fromName: userProfile.name
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

  return (
     // ... (JSX 保持不变，除了 "EmailJS 批量发送" 按钮文字建议修改)
     // 修改这一行:
     // <button onClick={handleBatchSend} ...> EmailJS 批量发送 </button>
     // 为:
     // <button onClick={handleBatchSend} ...> 批量发送 (Nodemailer) </button>

    <div className="min-h-screen flex flex-col font-sans text-slate-800">
      <ApiKeyInput onApiKeySet={setApiKey} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">IF</div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">InternFlow AI</h1>
                    <p className="text-xs text-gray-500 font-medium">智能简历投递系统 V3.2 (SMTP版)</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={() => setIsProfileModalOpen(true)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors">
                  ⚙️ 设置
                </button>
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 gap-8 flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex-1 flex flex-col">
                <h2 className="font-semibold text-gray-800 mb-3">非结构化输入</h2>
                <textarea
                    className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                    placeholder="粘贴招聘信息..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isParsing}
                />
                <button
                    onClick={handleParse}
                    disabled={isParsing || !inputText.trim()}
                    className={`mt-4 w-full py-3 rounded-lg font-semibold text-white shadow-md transition-all ${isParsing ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {isParsing ? '解析中...' : '智能识别'}
                </button>
            </div>
        </div>

        <div className="w-full lg:w-2/3 flex flex-col gap-4">
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden h-full min-h-[500px]">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="font-semibold text-gray-800">解析结果 ({jobs.length})</h2>
                    {jobs.length > 0 && <button onClick={() => setJobs([])} className="text-xs text-red-500">清空</button>}
                </div>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <th className="p-4 w-12 text-center">
                                    <input type="checkbox" onChange={toggleSelectAll} checked={jobs.length > 0 && jobs.every(j => j.selected)} className="w-4 h-4"/>
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
                            {jobs.map(job => (
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
                        </tbody>
                    </table>
                </div>
                <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                     <div className="text-sm text-gray-500">已选 {jobs.filter(j => j.selected).length} 项</div>
                     {!isSending && (
                        <button onClick={handleBatchSend} disabled={!jobs.some(j => j.selected)} className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold disabled:bg-gray-300">
                             批量发送 (SMTP)
                        </button>
                     )}
                </div>
             </div>
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