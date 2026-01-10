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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0 rounded-t-xl">
          <h3 className="text-lg font-bold text-white">编辑个人信息 & 系统配置</h3>
          <button onClick={onClose} className="text-indigo-100 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* AI Configuration */}
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
             <label className="block text-sm font-bold text-indigo-900 mb-2">🤖 AI 模型选择</label>
             <select 
                name="aiModel" 
                value={formData.aiModel} 
                onChange={handleChange}
                className="w-full p-2 border border-indigo-200 rounded focus:ring-indigo-500 focus:border-indigo-500 bg-white"
             >
                {AVAILABLE_MODELS.map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                ))}
             </select>
          </div>

          {/* EmailJS Configuration */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
             <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-bold text-orange-900">📧 EmailJS 发信配置 (真实发送)</label>
             </div>
             <p className="text-xs text-gray-500 mb-3">
               请在 <a href="https://dashboard.emailjs.com/" target="_blank" className="text-indigo-600 underline">EmailJS Dashboard</a> 获取以下信息。
               模板变量需配置: <code>{`{{to_name}}`}</code>, <code>{`{{to_email}}`}</code>, <code>{`{{subject}}`}</code>, <code>{`{{message}}`}</code>
             </p>
             <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Service ID</label>
                   <input name="emailjsServiceId" value={formData.emailjsServiceId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="service_xxxx" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Template ID</label>
                   <input name="emailjsTemplateId" value={formData.emailjsTemplateId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="template_xxxx" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Public Key (User ID)</label>
                   <input name="emailjsPublicKey" value={formData.emailjsPublicKey} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="user_xxxx 或 public_key" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">您的回信邮箱 (Reply-To)</label>
                   <input name="senderEmail" value={formData.senderEmail} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="your.email@example.com" />
                </div>
             </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
              <h4 className="font-semibold text-gray-800 border-b pb-2">基础信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">姓名</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">本科院校</label>
                  <input name="undergrad" value={formData.undergrad} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">硕士院校</label>
                  <input name="master" value={formData.master || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">硕士专业</label>
                   <input name="masterMajor" value={formData.masterMajor || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="例如: 计算机科学" />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">硕士毕业年份</label>
                  <input name="masterYear" value={formData.masterYear || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="2027" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">当前年级</label>
                   <input name="currentGrade" value={formData.currentGrade || ''} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" placeholder="研一" />
                </div>
              </div>
          </div>

          {/* Availability */}
          <div className="space-y-4">
               <h4 className="font-semibold text-gray-800 border-b pb-2">实习条件</h4>
               <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">实习时长</label>
                  <input name="availability" value={formData.availability} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">每周天数</label>
                  <input name="frequency" value={formData.frequency} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">到岗时间</label>
                   <input name="arrival" value={formData.arrival} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded focus:ring-indigo-500 text-sm" />
                </div>
              </div>
          </div>

          {/* Template */}
          <div className="space-y-2">
               <h4 className="font-semibold text-gray-800 border-b pb-2">邮件正文模板</h4>
               <p className="text-xs text-gray-500">可用变量: [姓名], [学校], [年级], [公司], [岗位], [时长], [天数], [到岗时间]</p>
               <textarea 
                  name="bodyTemplate" 
                  value={formData.bodyTemplate} 
                  onChange={handleChange} 
                  className="w-full h-32 p-3 border border-gray-300 rounded focus:ring-indigo-500 text-sm font-mono leading-relaxed"
                  placeholder="输入您的求职信模板..."
               />
          </div>

        </form>

         <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-xl">
             <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">
                取消
            </button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow">
                保存设置
            </button>
          </div>
      </div>
    </div>
  );
};

export default UserProfileModal;