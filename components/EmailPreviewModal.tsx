// components/EmailPreviewModal.tsx
import React, { useState, useEffect } from 'react';
import { JobApplication } from '../types';

interface EmailPreviewModalProps {
  job: JobApplication | null;
  onClose: () => void;
  // [修改] 允许发送时传入最新的 Job 对象
  onSendSingle: (job: JobApplication) => void;
  // [修改] 更新方法为 Promise，以便等待 DB 写入完成
  onUpdate: (id: string, updates: Partial<JobApplication>) => Promise<void>;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ job, onClose, onSendSingle, onUpdate }) => {
  const [localCompany, setLocalCompany] = useState('');
  const [localDepartment, setLocalDepartment] = useState('');
  const [localPosition, setLocalPosition] = useState('');
  const [localEmail, setLocalEmail] = useState('');
  const [localSubject, setLocalSubject] = useState('');
  const [localOpening, setLocalOpening] = useState('');
  const [localSource, setLocalSource] = useState('');
  const [localPraise, setLocalPraise] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localAttachReport, setLocalAttachReport] = useState(false);

  useEffect(() => {
    if (job) {
      setLocalCompany(job.company);
      setLocalDepartment(job.department || '');
      setLocalPosition(job.position);
      setLocalEmail(job.email);
      setLocalSubject(job.email_subject);
      setLocalOpening(job.opening_line);
      setLocalSource(job.job_source_line);
      setLocalPraise(job.praise_line);
      setLocalAttachReport(job.attach_report || false);
    }
  }, [job]);

  if (!job) return null;

  const updateInjectedVariables = (company: string, department: string, position: string) => {
    const opening = `${company}${position}招聘负责人老师：`;
    const source = `我了解到您发布的${position}的招聘JD`;
    const focusArea = department || position;
    const praise = `我对${company}在${focusArea}领域的深耕非常敬佩`;

    setLocalOpening(opening);
    setLocalSource(source);
    setLocalPraise(praise);
  };

  const handleCompanyChange = (val: string) => {
    setLocalCompany(val);
    updateInjectedVariables(val, localDepartment, localPosition);
  };

  const handleDepartmentChange = (val: string) => {
    setLocalDepartment(val);
    updateInjectedVariables(localCompany, val, localPosition);
  };

  const handlePositionChange = (val: string) => {
    setLocalPosition(val);
    updateInjectedVariables(localCompany, localDepartment, val);
  };

  // 辅助函数：获取当前所有的更新字段
  const getUpdates = () => ({
    company: localCompany,
    department: localDepartment,
    position: localPosition,
    email: localEmail,
    email_subject: localSubject,
    opening_line: localOpening,
    job_source_line: localSource,
    praise_line: localPraise,
    needs_review: false,
    review_reason: undefined,
    attach_report: localAttachReport
  });

  // 仅保存
  const handleSave = async () => {
    setIsSaving(true);
    try {
        await onUpdate(job.id, getUpdates());
        onClose();
    } catch (e) {
        // App.tsx 已经处理了报错 alert
        setIsSaving(false);
    }
  };

  // 发送 (也会自动保存)
  const handleSend = async () => {
    setIsSaving(true);
    const updates = getUpdates();
    
    try {
        // 1. 先同步到数据库
        await onUpdate(job.id, updates);
        
        // 2. 构造最新的 Job 对象 (合并旧数据和新修改)
        const updatedJob = { ...job, ...updates } as JobApplication;
        
        // 3. 直接发送最新的对象，不依赖父组件的 state 刷新
        onSendSingle(updatedJob);
        
        // 4. 关闭窗口
        onClose();
    } catch (e) {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <h3 className="text-lg font-semibold text-gray-800">投递详情编辑</h3>
             {job.needs_review && (
                 <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold border border-yellow-200">
                    需复核: {job.review_reason || "AI 标记存疑"}
                 </span>
             )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">关闭</button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8">
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-4">
                    <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wide">核心解析信息</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">公司</label>
                            <input 
                                className="w-full p-2 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-800"
                                value={localCompany}
                                onChange={(e) => handleCompanyChange(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">部门</label>
                            <input 
                                className="w-full p-2 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={localDepartment}
                                onChange={(e) => handleDepartmentChange(e.target.value)}
                                placeholder="未提取到"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">岗位</label>
                            <input 
                                className="w-full p-2 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                value={localPosition}
                                onChange={(e) => handlePositionChange(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-gray-100"/>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            收件人邮箱 <span className="text-xs font-normal text-gray-400">(多位请用逗号隔开)</span>
                        </label>
                        <input 
                            className="w-full p-2 border border-gray-300 rounded font-mono text-indigo-600 placeholder-gray-300"
                            value={localEmail} 
                            onChange={(e) => setLocalEmail(e.target.value)} 
                            placeholder="hr1@example.com, hr2@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">邮件标题</label>
                        <input className="w-full p-2 border border-gray-300 rounded" value={localSubject} onChange={(e) => setLocalSubject(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">动态注入变量预览</span>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 1: 开头称呼</label>
                        <input className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700" value={localOpening} onChange={(e) => setLocalOpening(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 2: 来源句</label>
                        <input className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700" value={localSource} onChange={(e) => setLocalSource(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 3: 敬佩句</label>
                        <textarea className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700 resize-none h-20" value={localPraise} onChange={(e) => setLocalPraise(e.target.value)} />
                    </div>
                </div>
            </div>
        </div>

	{/* Footer */}
        <div className="p-6 border-t bg-white flex justify-between items-center shrink-0">
             {/* [新增] 左侧开关：控制是否发送研报 */}
             <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input 
                    type="checkbox" 
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                    checked={localAttachReport}
                    onChange={(e) => setLocalAttachReport(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
                    同时发送大金研报附件
                </span>
             </label>

             {/* 右侧按钮组 */}
             <div className="flex gap-3">
                 <button 
                    onClick={onClose} 
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                 >
                    取消
                 </button>
                 
                 <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-6 py-3 border border-indigo-600 text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isSaving ? '保存中...' : '仅保存'}
                 </button>
                 
                 <button 
                    onClick={handleSend} 
                    disabled={job.status === 'sending' || isSaving} 
                    className="px-8 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                 >
                    {(job.status === 'sending' || isSaving) ? '处理中...' : '保存并发送 🚀'}
                 </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal;