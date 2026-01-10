import React, { useState, useEffect, useRef } from 'react';
import { JobApplication } from '../types';

interface EmailPreviewModalProps {
  job: JobApplication | null;
  onClose: () => void;
  onSendSingle: (job: JobApplication) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ job, onClose, onSendSingle, onUpdate }) => {
  const [localBody, setLocalBody] = useState('');
  const [localSubject, setLocalSubject] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (job) {
      setLocalBody(job.email_body);
      setLocalSubject(job.email_subject);
    }
  }, [job]);

  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job?.logs]);

  if (!job) return null;

  const handleSaveAndSend = () => {
    // Save changes locally to state first
    onUpdate(job.id, { 
        email_body: localBody,
        email_subject: localSubject
    });
    
    // Trigger sending
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
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                投递详情
            </h3>
            <p className="text-xs text-gray-500 mt-1">
                {job.company} {job.department ? `| ${job.department}` : ''} - {job.position}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
            {/* Left Column: Editor */}
            <div className="w-2/3 p-6 overflow-y-auto border-r border-gray-100 flex flex-col gap-5">
                 
                 {/* Metadata Grid */}
                 <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div>
                        <span className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">To</span>
                        <input 
                            className="w-full bg-transparent font-mono text-indigo-700 font-medium focus:outline-none border-b border-transparent focus:border-indigo-300"
                            value={job.email}
                            onChange={(e) => onUpdate(job.id, { email: e.target.value })}
                        />
                    </div>
                    <div>
                        <span className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Attachment</span>
                        <div className="flex items-center gap-1 text-gray-700">
                            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/></svg>
                            <span className="truncate">{job.filename}</span>
                        </div>
                    </div>
                </div>

                {/* Subject */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">邮件标题</label>
                    <input 
                        type="text"
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
                        value={localSubject}
                        onChange={(e) => setLocalSubject(e.target.value)}
                    />
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col">
                     <label className="block text-sm font-semibold text-gray-700 mb-2">邮件正文</label>
                     <textarea 
                        className="flex-1 w-full p-4 border border-gray-300 rounded-lg text-sm text-gray-700 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm font-mono"
                        value={localBody}
                        onChange={(e) => setLocalBody(e.target.value)}
                     />
                </div>
            </div>

            {/* Right Column: Status & Logs */}
            <div className="w-1/3 bg-gray-900 flex flex-col">
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                    <h4 className="text-gray-300 font-semibold text-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        SMTP 发送日志
                    </h4>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2">
                    {job.logs && job.logs.length > 0 ? (
                        job.logs.map((log, index) => (
                            <div key={index} className="text-gray-300 border-l-2 border-indigo-500 pl-2">
                                <span className="text-gray-500 mr-2">[{log.split(']')[0].replace('[','')}]</span>
                                {log.split(']').slice(1).join(']')}
                            </div>
                        ))
                    ) : (
                        <div className="text-gray-600 italic">暂无日志。点击发送开始传输。</div>
                    )}
                    <div ref={logsEndRef} />
                </div>
                
                {/* Action Area */}
                <div className="p-4 border-t border-gray-700 bg-gray-800">
                     <div className="flex items-center justify-between mb-4 text-gray-400 text-xs">
                        <span>Status: </span>
                        <span className={`font-bold px-2 py-0.5 rounded ${
                            job.status === 'sent' ? 'bg-green-900 text-green-400' :
                            job.status === 'sending' ? 'bg-yellow-900 text-yellow-400' :
                            job.status === 'error' ? 'bg-red-900 text-red-400' : 'bg-gray-700'
                        }`}>
                            {job.status.toUpperCase()}
                        </span>
                     </div>
                     <button
                        onClick={handleSaveAndSend}
                        disabled={job.status === 'sending' || job.status === 'sent'}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                             ${job.status === 'sent' 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : job.status === 'sending'
                                    ? 'bg-gray-600 cursor-wait'
                                    : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]'
                             }
                        `}
                     >
                        {job.status === 'sending' ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                发送中...
                            </>
                        ) : job.status === 'sent' ? (
                             <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                发送成功
                            </>
                        ) : (
                             <>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                SMTP 立即发送
                            </>
                        )}
                     </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;
