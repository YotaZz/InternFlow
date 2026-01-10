import React, { useState, useEffect, useRef } from 'react';
import { JobApplication } from '../types';

interface EmailPreviewModalProps {
  job: JobApplication | null;
  onClose: () => void;
  onSendSingle: (job: JobApplication) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ job, onClose, onSendSingle, onUpdate }) => {
  // 本地状态改为存储三个片段
  const [localSubject, setLocalSubject] = useState('');
  const [localOpening, setLocalOpening] = useState('');
  const [localSource, setLocalSource] = useState('');
  const [localPraise, setLocalPraise] = useState('');
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (job) {
      setLocalSubject(job.email_subject);
      setLocalOpening(job.opening_line);
      setLocalSource(job.job_source_line);
      setLocalPraise(job.praise_line);
    }
  }, [job]);

  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job?.logs]);

  if (!job) return null;

  const handleSaveAndSend = () => {
    onUpdate(job.id, { 
        email_subject: localSubject,
        opening_line: localOpening,
        job_source_line: localSource,
        praise_line: localPraise
    });
    
    setTimeout(() => {
        onSendSingle(job);
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
                投递详情: {job.company} - {job.position}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 12"/></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Left: Editor */}
            <div className="w-2/3 p-6 overflow-y-auto border-r border-gray-100 flex flex-col gap-6">
                
                {/* 1. To & Attachment */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">To Email</span>
                        <input className="w-full bg-transparent font-mono text-indigo-700 font-bold outline-none" 
                            value={job.email} onChange={(e) => onUpdate(job.id, { email: e.target.value })} />
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">File</span>
                        <div className="text-gray-700 text-sm truncate">{job.filename}</div>
                    </div>
                </div>

                {/* 2. Subject */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">邮件标题 (Subject)</label>
                    <input className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                        value={localSubject} onChange={(e) => setLocalSubject(e.target.value)} />
                </div>

                {/* 3. Variables Editor */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                         <span className="h-px bg-gray-200 flex-1"></span>
                         <span className="text-xs font-bold text-gray-400 uppercase">模板变量注入 (Variables)</span>
                         <span className="h-px bg-gray-200 flex-1"></span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 1: 开头称呼 ({`{{opening_line}}`})</label>
                        <input className="w-full p-2 bg-indigo-50/50 border border-indigo-100 rounded text-sm font-mono text-gray-800"
                            value={localOpening} onChange={(e) => setLocalOpening(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 2: 来源句 ({`{{job_source_line}}`})</label>
                        <input className="w-full p-2 bg-indigo-50/50 border border-indigo-100 rounded text-sm font-mono text-gray-800"
                            value={localSource} onChange={(e) => setLocalSource(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 3: 敬佩句 ({`{{praise_line}}`})</label>
                        <textarea className="w-full p-2 bg-indigo-50/50 border border-indigo-100 rounded text-sm font-mono text-gray-800 resize-none h-20"
                            value={localPraise} onChange={(e) => setLocalPraise(e.target.value)} />
                    </div>
                </div>

                <div className="text-xs text-gray-400 italic mt-auto">
                    * 其他正文内容 (个人介绍、优势、结尾) 将直接使用 EmailJS 后台配置的固定模板。
                </div>
            </div>

            {/* Right: Logs (不变) */}
            <div className="w-1/3 bg-gray-900 flex flex-col">
                {/* ... (保持原本的 Log 区域代码不变) ... */}
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                    <h4 className="text-gray-300 font-semibold text-sm">发送日志</h4>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2">
                    {job.logs?.map((log, i) => (
                        <div key={i} className="text-gray-300 border-l-2 border-indigo-500 pl-2">{log}</div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
                 <div className="p-4 border-t border-gray-700 bg-gray-800">
                     <button
                        onClick={handleSaveAndSend}
                        disabled={job.status === 'sending' || job.status === 'sent'}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all 
                             ${job.status === 'sent' ? 'bg-green-600' : job.status === 'sending' ? 'bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700'}
                        `}
                     >
                        {job.status === 'sending' ? '发送中...' : job.status === 'sent' ? '发送成功' : '立即发送'}
                     </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
export default EmailPreviewModal;