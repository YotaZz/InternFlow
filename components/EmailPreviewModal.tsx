import React, { useState, useEffect, useRef } from 'react';
import { JobApplication } from '../types';

interface EmailPreviewModalProps {
  job: JobApplication | null;
  onClose: () => void;
  onSendSingle: (job: JobApplication) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ job, onClose, onSendSingle, onUpdate }) => {
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
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
          <h3 className="text-lg font-semibold text-gray-800">投递详情: {job.company}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">关闭</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
            <div className="w-2/3 p-6 overflow-y-auto border-r border-gray-100 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">邮箱</span>
                        <div className="font-mono text-indigo-700 font-bold">{job.email}</div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">邮件标题</label>
                    <input className="w-full p-2 border border-gray-300 rounded" value={localSubject} onChange={(e) => setLocalSubject(e.target.value)} />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2"><span className="text-xs font-bold text-gray-400 uppercase">变量注入</span></div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 1: 开头称呼</label>
                        <input className="w-full p-2 bg-indigo-50/50 border border-indigo-100 rounded text-sm font-mono" value={localOpening} onChange={(e) => setLocalOpening(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 2: 来源句</label>
                        <input className="w-full p-2 bg-indigo-50/50 border border-indigo-100 rounded text-sm font-mono" value={localSource} onChange={(e) => setLocalSource(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 3: 敬佩句</label>
                        <textarea className="w-full p-2 bg-indigo-50/50 border border-indigo-100 rounded text-sm font-mono resize-none h-20" value={localPraise} onChange={(e) => setLocalPraise(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="w-1/3 bg-gray-900 flex flex-col">
                <div className="p-4 border-b border-gray-700"><h4 className="text-gray-300 font-semibold text-sm">日志</h4></div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 text-gray-300">
                    {job.logs?.map((log, i) => <div key={i}>{log}</div>)}
                    <div ref={logsEndRef} />
                </div>
                 <div className="p-4 border-t border-gray-700">
                     <button onClick={handleSaveAndSend} disabled={job.status === 'sending'} className="w-full py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700">立即发送</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
export default EmailPreviewModal;