import React, { useState } from 'react';
import { UserProfile } from '../types';
import { AVAILABLE_MODELS } from '../constants';

interface UserProfileModalProps {
  currentProfile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ currentProfile, onSave, onClose }) => {
  const [formData, setFormData] = useState<UserProfile>(currentProfile);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-white">系统设置</h3>
          <button onClick={onClose} className="text-indigo-100 hover:text-white">✕</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* AI Model */}
          <div>
             <label className="block text-sm font-bold text-gray-700 mb-2">AI 模型</label>
             <select name="aiModel" value={formData.aiModel} onChange={handleChange} className="w-full p-2 border rounded">
                {AVAILABLE_MODELS.map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                ))}
             </select>
          </div>

          {/* Email Config */}
          <div className="bg-green-50 p-4 rounded border border-green-200">
             <label className="block text-sm font-bold text-green-900 mb-2">邮件发送配置 (Vercel + Nodemailer)</label>
             <p className="text-xs text-green-700 mb-3">
               注意：请确保在 Vercel 项目设置的 "Environment Variables" 中配置了 
               <code className="bg-green-100 px-1 mx-1 rounded">QQ_EMAIL</code> 和 
               <code className="bg-green-100 px-1 mx-1 rounded">QQ_PASSWORD</code> (授权码)。
             </p>
             <div className="grid grid-cols-1 gap-4">
                <div>
                   <label className="text-xs text-gray-500">回复邮箱 (Reply-To)</label>
                   <input 
                     name="senderEmail" 
                     value={formData.senderEmail} 
                     onChange={handleChange} 
                     placeholder="HR 回复时收信的邮箱 (如您的个人邮箱)" 
                     className="w-full p-2 border rounded text-sm"
                   />
                </div>
                <div>
                   <label className="text-xs text-gray-500 mb-1 block">邮件正文模板 (支持 HTML)</label>
                   <p className="text-[10px] text-gray-400 mb-2">可用变量: {'{{opening_line}}, {{job_source_line}}, {{praise_line}}, {{name}}, {{undergrad}}, {{master_info}}, {{availability}}, {{company}} ...'}</p>
                   <textarea
                     name="bodyTemplate"
                     value={formData.bodyTemplate}
                     onChange={handleChange}
                     className="w-full p-2 border rounded text-xs font-mono h-32"
                   />
                </div>
             </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
              <h4 className="font-semibold border-b pb-2">基础信息 (用于 AI 生成及邮件填充)</h4>
              <div className="grid grid-cols-2 gap-4">
                  {/* ... 保持原有字段 ... */}
                  <div>
                    <label className="text-xs text-gray-500">姓名</label>
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">本科院校</label>
                    <input name="undergrad" value={formData.undergrad} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">硕士院校</label>
                    <input name="master" value={formData.master || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">硕士专业</label>
                    <input name="masterMajor" value={formData.masterMajor || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">毕业年份</label>
                    <input name="masterYear" value={formData.masterYear || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">当前年级</label>
                    <input name="currentGrade" value={formData.currentGrade || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">实习时长</label>
                    <input name="availability" value={formData.availability} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">出勤频率</label>
                    <input name="frequency" value={formData.frequency} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">到岗时间</label>
                    <input name="arrival" value={formData.arrival} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
              </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">取消</button>
            <button onClick={() => { onSave(formData); onClose(); }} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">保存</button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;