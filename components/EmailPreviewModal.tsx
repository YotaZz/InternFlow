import React, { useState, useEffect } from 'react';
import { JobApplication } from '../types';

interface EmailPreviewModalProps {
  job: JobApplication | null;
  onClose: () => void;
  onSendSingle: (job: JobApplication) => void;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ job, onClose, onSendSingle, onUpdate }) => {
  // 核心解析字段
  const [localCompany, setLocalCompany] = useState('');
  const [localDepartment, setLocalDepartment] = useState('');
  const [localPosition, setLocalPosition] = useState('');
  const [localEmail, setLocalEmail] = useState('');

  // 邮件相关
  const [localSubject, setLocalSubject] = useState('');
  
  // 注入变量
  const [localOpening, setLocalOpening] = useState('');
  const [localSource, setLocalSource] = useState('');
  const [localPraise, setLocalPraise] = useState('');
  
  // 初始化
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
    }
  }, [job]);

  if (!job) return null;

  // [Fix Issue 4] 联动逻辑：当公司/部门/岗位改变时，自动更新注入变量
  const updateInjectedVariables = (company: string, department: string, position: string) => {
    // 逻辑与 geminiService.ts 保持一致
    const opening = `${company}${position}招聘负责人老师：`;
    
    const deptPart = department ? department : "";
    const source = `我了解到您发布的${deptPart}${position}的招聘JD`;

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

  const handleSaveAndSend = () => {
    onUpdate(job.id, { 
        company: localCompany,
        department: localDepartment,
        position: localPosition,
        email: localEmail,
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
      <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
          <h3 className="text-lg font-semibold text-gray-800">投递详情编辑</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">关闭</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="flex flex-col gap-6 max-w-3xl mx-auto">
                
                {/* 核心解析信息 - [Fix Issue 4] 可编辑且联动 */}
                <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 space-y-4">
                    <h4 className="text-sm font-bold text-indigo-800 uppercase tracking-wide">核心解析信息 (修改此处会自动更新下方变量)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">公司 (简称)</label>
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

                {/* 邮件基本信息 */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">收件人邮箱</label>
                        <input className="w-full p-2 border border-gray-300 rounded font-mono text-indigo-600" value={localEmail} onChange={(e) => setLocalEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">邮件标题</label>
                        <input className="w-full p-2 border border-gray-300 rounded" value={localSubject} onChange={(e) => setLocalSubject(e.target.value)} />
                    </div>
                </div>

                {/* 变量注入预览 */}
                <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">动态注入变量预览</span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 1: 开头称呼 (opening_line)</label>
                        <input className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700" value={localOpening} onChange={(e) => setLocalOpening(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 2: 来源句 (job_source_line)</label>
                        <input className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700" value={localSource} onChange={(e) => setLocalSource(e.target.value)} />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1">变量 3: 敬佩句 (praise_line)</label>
                        <textarea className="w-full p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700 resize-none h-20" value={localPraise} onChange={(e) => setLocalPraise(e.target.value)} />
                    </div>
                </div>
            </div>
        </div>

        <div className="p-6 border-t bg-white flex justify-end gap-3 shrink-0">
             <button onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">取消</button>
             <button onClick={handleSaveAndSend} disabled={job.status === 'sending'} className="px-8 py-3 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg transition-colors flex items-center gap-2">
                {job.status === 'sending' ? '发送中...' : '保存并发送 🚀'}
             </button>
        </div>
      </div>
    </div>
  );
};
export default EmailPreviewModal;