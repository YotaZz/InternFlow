// components/JobEntryRow.tsx
import React, { useState } from 'react';
import { JobApplication, ProfileType, UserProfile } from '../types';
import { SOURCE_OPTIONS } from '../constants';

interface JobEntryRowProps {
  job: JobApplication;
  userProfile: UserProfile;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onPreview: (job: JobApplication) => void;
  isDuplicate?: boolean;
}

const JobEntryRow: React.FC<JobEntryRowProps> = ({ 
  job, 
  userProfile, 
  onUpdate, 
  onDelete, 
  onToggleSelect, 
  onPreview, 
  isDuplicate 
}) => {
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingSource, setIsEditingSource] = useState(false);

  // 状态辅助变量
  const isSending = job.status === 'sending';
  const isError = job.status === 'error';

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newProfile = e.target.value as ProfileType;
    let newSubject = job.email_subject;
    const baseSchool = userProfile.undergrad;
    const masterSchool = userProfile.master || '';
    const fullSchool = `${baseSchool}&${masterSchool}`;

    // 尝试智能替换标题中的学校字段
    if (newProfile === ProfileType.Master && job.profile_selected === ProfileType.Base) {
       if (newSubject.includes(baseSchool)) newSubject = newSubject.replace(baseSchool, fullSchool);
    } 
    else if (newProfile === ProfileType.Base && job.profile_selected === ProfileType.Master) {
       if (newSubject.includes(fullSchool)) newSubject = newSubject.replace(fullSchool, baseSchool);
    }

    onUpdate(job.id, { 
        profile_selected: newProfile,
        email_subject: newSubject,
        filename: newSubject + ".pdf" 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-700 ring-1 ring-green-200';
      case 'sending': return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200 animate-pulse';
      case 'error': return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      default: return 'bg-gray-100 text-gray-600 ring-1 ring-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
        case 'sent': return '已发送';
        case 'sending': return '发送中...';
        case 'error': return '发送失败';
        default: return '待处理';
    }
  };

  const handleRowClick = (e: React.MouseEvent) => {
      // 发送中禁止点击打开详情，防止状态冲突
      if (isSending) return;

      const target = e.target as HTMLElement;
      // 避免点击输入框或下拉菜单时触发预览
      if (target.tagName.toLowerCase() !== 'input' && 
          target.tagName.toLowerCase() !== 'select' && 
          target.tagName.toLowerCase() !== 'textarea' &&
          !target.closest('button')) {
          onPreview(job);
      }
  };

  // 根据状态动态调整行背景色
  const rowStyleClass = isSending 
    ? 'bg-blue-50/60 border-b border-blue-100 cursor-progress' 
    : isError 
        ? 'bg-red-50/60 border-b border-red-100'
        : job.selected 
            ? 'bg-indigo-50/60 border-b border-indigo-100' 
            : 'hover:bg-gray-50 border-b border-gray-100';

  return (
    <tr onClick={handleRowClick} className={`transition-colors cursor-pointer group ${rowStyleClass}`}>
      {/* 1. 复选框 / Loading 状态 */}
      <td className="p-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
        {isSending ? (
            <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        ) : (
            <input 
            type="checkbox" 
            checked={job.selected || false} 
            onChange={() => onToggleSelect(job.id)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
            disabled={isSending} // 发送中禁用选择
            />
        )}
      </td>

      {/* 2. 序号 */}
      <td className="p-4 align-middle text-center text-xs text-gray-400 font-mono">
         {job.seq_id}
      </td>

      {/* 3. 信息摘要 (公司/岗位) */}
      <td className="p-4 align-middle">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold text-base ${isError ? 'text-red-700' : 'text-gray-900'}`}>
                    {job.company}
                </span>
                {job.needs_review && !isSending && (
                    <span 
                        title={job.review_reason || "AI 建议复核"}
                        className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 whitespace-nowrap cursor-help"
                    >
                        ⚠️ 需复核
                    </span>
                )}
            </div>
            <div className="flex items-center text-sm text-gray-600">
                <span>{job.position}</span>
                {job.department && (
                    <>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span className="text-gray-500">{job.department}</span>
                    </>
                )}
            </div>
            {/* 错误提示文字 */}
            {isError && (
                <div className="text-[10px] text-red-500 font-medium mt-0.5 animate-pulse">
                    ⚠️ 发送中断，请检查网络或配置后重试
                </div>
            )}
        </div>
      </td>
      
      {/* 4. 来源 - 支持编辑 */}
      <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
        {isEditingSource && !isSending ? (
            <div className="relative">
                <input 
                    list="source-options-list"
                    autoFocus
                    value={job.source || ''}
                    onChange={(e) => onUpdate(job.id, { source: e.target.value })}
                    onBlur={() => setIsEditingSource(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingSource(false)}
                    className="w-full text-xs p-1.5 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
                <datalist id="source-options-list">
                    {SOURCE_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                </datalist>
            </div>
        ) : (
            <span 
                onClick={() => !isSending && setIsEditingSource(true)}
                className={`inline-block text-[11px] border px-2.5 py-1 rounded-md shadow-sm transition-all whitespace-nowrap ${
                    isSending 
                    ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border-gray-200 text-gray-600 cursor-pointer hover:border-indigo-300 hover:text-indigo-600'
                }`}
                title={isSending ? "发送中不可编辑" : "点击修改来源"}
            >
                {job.source || '未知'}
            </span>
        )}
      </td>

      {/* 5. 邮箱 */}
      <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-1.5">
            {isEditingEmail && !isSending ? (
                <input
                    type="text"
                    autoFocus
                    value={job.email}
                    onChange={(e) => onUpdate(job.id, { email: e.target.value })}
                    onBlur={() => setIsEditingEmail(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingEmail(false)}
                    className={`text-xs font-mono p-1.5 border rounded w-full focus:ring-2 focus:outline-none ${!job.email ? 'border-red-300 bg-red-50' : 'border-indigo-300 focus:ring-indigo-500/20'}`}
                />
            ) : (
                <div 
                    onClick={() => !isSending && setIsEditingEmail(true)}
                    className={`text-xs font-mono px-2 py-1 rounded border transition-colors break-all ${
                        isSending 
                        ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                        : !job.email 
                            ? 'text-red-500 bg-red-50 border-red-200 cursor-text' 
                            : 'text-gray-600 bg-gray-50 border-gray-200 hover:border-indigo-300 cursor-text'
                    }`}
                    title={isSending ? "发送中不可编辑" : "点击修改邮箱"}
                >
                    {job.email || "未提取到邮箱"}
                </div>
            )}
            
            {isDuplicate && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 w-fit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    重复投递
                </div>
            )}
        </div>
      </td>

      {/* 6. 标题 */}
      <td className="p-4 align-middle" onClick={(e) => e.stopPropagation()}>
        {isEditingSubject && !isSending ? (
          <input
            type="text"
            autoFocus
            value={job.email_subject}
            onChange={(e) => onUpdate(job.id, { email_subject: e.target.value, filename: e.target.value + ".pdf" })}
            onBlur={() => setIsEditingSubject(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingSubject(false)}
            className="w-full text-xs p-1.5 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        ) : (
          <div className="flex flex-col gap-2">
             <div 
                onClick={() => !isSending && setIsEditingSubject(true)}
                className={`text-xs transition-colors truncate max-w-xs ${
                    isSending 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'text-gray-700 cursor-text hover:text-indigo-600'
                }`}
                title={job.email_subject}
             >
                {job.email_subject}
             </div>
             {/* Profile 选择器 */}
             <select 
                value={job.profile_selected} 
                onChange={handleProfileChange}
                disabled={isSending}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded border focus:outline-none w-fit transition-opacity ${
                    isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                    job.profile_selected === ProfileType.Master 
                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
            >
                <option value={ProfileType.Base}>基础 ({userProfile.undergrad})</option>
                <option value={ProfileType.Master}>进阶 (硕)</option>
            </select>
          </div>
        )}
      </td>

      {/* 7. 状态 (居中显示，错误时可点击重置) */}
      <td className="p-4 align-middle text-center">
         {isError ? (
             <button 
                onClick={(e) => { e.stopPropagation(); onUpdate(job.id, { status: 'pending' as any }); }}
                className="text-[10px] font-bold text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                title="点击重置为待处理"
             >
                失败 (重置)
             </button>
         ) : (
             <span className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusColor(job.status)}`}>
                {getStatusText(job.status)}
             </span>
         )}
      </td>

      {/* 8. 操作 */}
      <td className="p-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
            <button 
                onClick={() => onPreview(job)}
                disabled={isSending}
                className={`p-1.5 rounded-md transition-colors ${
                    isSending 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                title="详情/发送"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button 
                onClick={() => onDelete(job.id)}
                disabled={isSending}
                className={`p-1.5 rounded-md transition-colors ${
                    isSending 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                }`}
                title="删除"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
        </div>
      </td>
    </tr>
  );
};

export default JobEntryRow;