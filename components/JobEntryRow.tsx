import React, { useState } from 'react';
import { JobApplication, ProfileType } from '../types';

interface JobEntryRowProps {
  job: JobApplication;
  onUpdate: (id: string, updates: Partial<JobApplication>) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onPreview: (job: JobApplication) => void;
}

const JobEntryRow: React.FC<JobEntryRowProps> = ({ job, onUpdate, onDelete, onToggleSelect, onPreview }) => {
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newProfile = e.target.value as ProfileType;
    
    // Simple heuristic to update subject immediately if user changes profile manually
    let newSubject = job.email_subject;
    if (newProfile === ProfileType.NUS_2027 && job.profile_selected === ProfileType.XMU_Only) {
       newSubject = newSubject.replace("厦门大学", "厦门大学&NUS");
    } else if (newProfile === ProfileType.XMU_Only && job.profile_selected === ProfileType.NUS_2027) {
       newSubject = newSubject.replace("厦门大学&NUS", "厦门大学");
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
      // Prevent clicking on input/select/button from triggering the preview
      if ((e.target as HTMLElement).tagName.toLowerCase() !== 'input' && 
          (e.target as HTMLElement).tagName.toLowerCase() !== 'select' && 
          (e.target as HTMLElement).tagName.toLowerCase() !== 'button' &&
          !(e.target as HTMLElement).closest('button')) {
          onPreview(job);
      }
  };

  return (
    <tr 
        onClick={handleRowClick}
        className={`hover:bg-gray-50 transition-colors cursor-pointer ${job.selected ? 'bg-indigo-50/30' : ''}`}
    >
      <td className="p-4 w-12" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox" 
          checked={job.selected} 
          onChange={() => onToggleSelect(job.id)}
          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
        />
      </td>
      <td className="p-4">
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
                className="text-sm font-mono p-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
            />
        ) : (
             <div 
                onClick={() => setIsEditingEmail(true)}
                className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded inline-block border border-gray-200 cursor-text hover:border-indigo-300"
                title="点击修改邮箱"
            >
                {job.email}
            </div>
        )}
      </td>
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <select 
          value={job.profile_selected} 
          onChange={handleProfileChange}
          className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            job.profile_selected === ProfileType.NUS_2027 
              ? 'bg-purple-100 text-purple-700 border-purple-200 focus:ring-purple-500' 
              : 'bg-blue-100 text-blue-700 border-blue-200 focus:ring-blue-500'
          }`}
        >
          <option value={ProfileType.XMU_Only}>XMU (基础)</option>
          <option value={ProfileType.NUS_2027}>XMU & NUS (高潜)</option>
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
