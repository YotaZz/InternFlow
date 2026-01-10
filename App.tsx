import React, { useState } from 'react';
import ApiKeyInput from './components/ApiKeyInput';
import JobEntryRow from './components/JobEntryRow';
import EmailPreviewModal from './components/EmailPreviewModal';
import UserProfileModal from './components/UserProfileModal';
import { parseRecruitmentText } from './services/geminiService';
import { JobApplication, ProfileType, ParsingResult, UserProfile } from './types';
import { DEFAULT_USER_PROFILE } from './constants';
import emailjs from '@emailjs/browser';

const generateId = () => Math.random().toString(36).substring(2, 9);

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
        // [修改] 移除旧的 subject 和 schoolStr 拼接逻辑
        // 直接使用 AI 返回的 email_subject 和 profile_selected

        return {
            id: generateId(),
            company: res.company,
            department: res.department, 
            position: res.position,
            email: res.email,
            profile_selected: res.profile_selected as ProfileType,
            
            // [修改] 直接使用 AI 生成的标题
            email_subject: res.email_subject,
            filename: `${res.email_subject}.pdf`, // 简历文件名与标题一致
            
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


  const updateJob = (id: string, updates: Partial<JobApplication>) => {
    setJobs(prev => {
        const newJobs = prev.map(job => job.id === id ? { ...job, ...updates } : job);
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
    const allSelected = jobs.length > 0 && jobs.every(j => j.selected);
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

    let processedCount = 0;
    
    jobsToSend.forEach((job, index) => {
        setTimeout(() => {
            handleSendEmail(job.id);
            processedCount++;
            setSendProgress((processedCount / jobsToSend.length) * 100);
            
            if (processedCount === jobsToSend.length) {
                setTimeout(() => setIsSending(false), 2000);
            }
        }, index * 2000); 
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
    addLog(`Initializing EmailJS send to ${job.email}...`);

    try {
        const templateParams = {
            // 变量注入
            opening_line: job.opening_line,
            job_source_line: job.job_source_line,
            praise_line: job.praise_line,
            
            // 固定信息
            to_name: job.company,
            to_email: job.email,
            subject: job.email_subject,
            from_name: userProfile.name,
            // [Fix Issue 1] 增加 from_email 透传，并保留 reply_to
            reply_to: userProfile.senderEmail,
            from_email: userProfile.senderEmail
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

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">IF</div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">InternFlow AI</h1>
                    <p className="text-xs text-gray-500 font-medium">智能简历投递系统 V3.1</p>
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
                             EmailJS 批量发送
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