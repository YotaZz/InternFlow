import React, { useState } from 'react';
import { JobApplication, ProfileType, UserProfile } from '../types';

interface JobEntryRowProps {
  job: JobApplication;
  // [新增] 引入 userProfile 以实现动态渲染
  userProfile: UserProfile;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onPreview: (job: JobApplication) => void;
}

const JobEntryRow: React.FC<JobEntryRowProps> = ({ job, userProfile, onUpdate, onDelete, onToggleSelect, onPreview }) => {
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  // [重构] 动态替换逻辑，不再硬编码 "厦门大学" 或 "NUS"
  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newProfile = e.target.value as ProfileType;
    
    let newSubject = job.email_subject;
    const baseSchool = userProfile.undergrad;
    const masterSchool = userProfile.master || '';
    const fullSchool = `${baseSchool}&${masterSchool}`;

    // 如果从 Base 切换到 Master (需要添加硕士信息)
    if (newProfile === ProfileType.Master && job.profile_selected === ProfileType.Base) {
       // 尝试将仅含本科的替换为本硕
       if (newSubject.includes(baseSchool)) {
           newSubject = newSubject.replace(baseSchool, fullSchool);
       }
    } 
    // 如果从 Master 切换到 Base (需要移除硕士信息)
    else if (newProfile === ProfileType.Base && job.profile_selected === ProfileType.Master) {
       if (newSubject.includes(fullSchool)) {
           newSubject = newSubject.replace(fullSchool, baseSchool);
       }
    }

    onUpdate(job.id, { 
        profile_selected: newProfile,
        email_subject: newSubject,
        filename: newSubject + ".pdf" 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 border-green-200';
      case 'sending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
      if ((e.target as HTMLElement).tagName.toLowerCase() !== 'input' && 
          (e.target as HTMLElement).tagName.toLowerCase() !== 'select' && 
          (e.target as HTMLElement).tagName.toLowerCase() !== 'button' &&
          !(e.target as HTMLElement).closest('button')) {
          onPreview(job);
      }
  };

  const rowStyleClass = job.needs_review 
    ? 'bg-yellow-50 border-2 border-yellow-400' 
    : job.selected 
        ? 'bg-indigo-50/30 border-b border-gray-100' 
        : 'hover:bg-gray-50 border-b border-gray-100';

  return (
    <tr onClick={handleRowClick} className={`transition-colors cursor-pointer relative ${rowStyleClass}`}>
      <td className="p-4 w-12" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={job.selected} 
          onChange={() => onToggleSelect(job.id)}
          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
        />
      </td>
      <td className="p-4 relative">
        {job.needs_review && (
            <span className="absolute top-2 right-2 text-[10px] font-bold text-yellow-700 bg-yellow-200 px-1.5 py-0.5 rounded border border-yellow-300 z-10">
                需复核
            </span>
        )}
        <div className="font-medium text-gray-900">
            {job.company} 
            {job.department && <span className="text-gray-400 font-normal mx-1">| {job.department}</span>}
        </div>
        <div className="text-sm text-gray-500">{job.position}</div>
      </td>
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        {isEditingEmail ? (
             <input
                type="text"
                autoFocus
                value={job.email}
                onChange={(e) => onUpdate(job.id, { email: e.target.value })}
                onBlur={() => setIsEditingEmail(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingEmail(false)}
                className={`text-sm font-mono p-1 border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full ${!job.email ? 'border-red-400 bg-red-50' : 'border-indigo-300'}`}
            />
        ) : (
             <div 
                onClick={() => setIsEditingEmail(true)}
                className={`text-sm font-mono px-2 py-1 rounded inline-block border cursor-text hover:border-indigo-300 ${!job.email ? 'text-red-500 bg-red-50 border-red-200' : 'text-gray-600 bg-gray-50 border-gray-200'}`}
                title="点击修改邮箱"
            >
                {job.email || "未提取到邮箱"}
            </div>
        )}
      </td>
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        {/* [重构] 动态显示学校名称 */}
        <select 
          value={job.profile_selected} 
          onChange={handleProfileChange}
          className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            job.profile_selected === ProfileType.Master 
              ? 'bg-purple-100 text-purple-700 border-purple-200 focus:ring-purple-500' 
              : 'bg-blue-100 text-blue-700 border-blue-200 focus:ring-blue-500'
          }`}
        >
          <option value={ProfileType.Base}>{userProfile.undergrad} (基础)</option>
          <option value={ProfileType.Master}>{userProfile.undergrad} & {userProfile.master || '硕士'} (高潜)</option>
        </select>
      </td>
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        {isEditingSubject ? (
          <input
            type="text"
            autoFocus
            value={job.email_subject}
            onChange={(e) => onUpdate(job.id, { email_subject: e.target.value, filename: e.target.value + ".pdf" })}
            onBlur={() => setIsEditingSubject(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingSubject(false)}
            className="w-full text-sm p-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        ) : (
          <div 
            onClick={() => setIsEditingSubject(true)}
            className="text-sm text-gray-700 cursor-text hover:bg-white hover:shadow-sm p-1 rounded border border-transparent hover:border-gray-200 transition-all truncate max-w-xs"
            title="点击修改"
          >
            {job.email_subject}
          </div>
        )}
      </td>
      {/* ... 状态列和按钮列不变 ... */}
      <td className="p-4">
         <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(job.status)}`}>
            {getStatusText(job.status)}
         </span>
      </td>
      <td className="p-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => onPreview(job)}
          className="text-indigo-600 hover:text-indigo-800 transition-colors text-xs font-medium bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
        >
          详情
        </button>
        <button 
          onClick={() => onDelete(job.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="删除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  );
};

export default JobEntryRow;