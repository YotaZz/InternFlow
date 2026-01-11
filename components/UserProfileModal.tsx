// components/UserProfileModal.tsx
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
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-white">系统设置</h3>
          <button onClick={onClose} className="text-indigo-100 hover:text-white text-2xl leading-none">&times;</button>
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

          {/* 岗位筛选配置 */}
          <div className="bg-orange-50 p-4 rounded border border-orange-200">
             <label className="block text-sm font-bold text-orange-900 mb-2">智能岗位筛选</label>
             <p className="text-xs text-orange-700 mb-2">
               AI 将根据以下条件自动判断岗位是否合适。未通过筛选的岗位将进入“已过滤”列表。
             </p>
             <textarea
               name="filterCriteria"
               value={formData.filterCriteria}
               onChange={handleChange}
               className="w-full p-2 border rounded text-xs font-mono h-20"
               placeholder="例如：不要技术岗、不要HR..."
             />
          </div>

          {/* Email Config */}
          <div className="bg-green-50 p-4 rounded border border-green-200">
             <label className="block text-sm font-bold text-green-900 mb-2">邮件发送配置 (SMTP)</label>
             
             {/* [新增] 发件人昵称配置 */}
             <div className="mb-4">
                 <label className="block text-xs font-bold text-gray-500 mb-1">发件人昵称 (Sender Name)</label>
                 <input 
                    name="senderName" 
                    value={formData.senderName || ''} 
                    onChange={handleChange} 
                    placeholder="HR 看到的“发件人”名字，建议填写全名" 
                    className="w-full p-2 border rounded text-sm bg-white"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">若不填则默认使用基础信息中的“姓名”。</p>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                    <label className="text-xs text-gray-500 font-bold">SMTP 账号</label>
                    <input 
                      name="smtpUser" 
                      value={formData.smtpUser || ''} 
                      onChange={handleChange} 
                      placeholder="例: 123456@qq.com" 
                      className="w-full p-2 border rounded text-sm"
                    />
                 </div>
                 <div>
                    <label className="text-xs text-gray-500 font-bold">SMTP 授权码</label>
                    <input 
                      type="password"
                      name="smtpPass" 
                      value={formData.smtpPass || ''} 
                      onChange={handleChange} 
                      placeholder="QQ邮箱16位授权码" 
                      className="w-full p-2 border rounded text-sm"
                    />
                 </div>
             </div>
             <div className="grid grid-cols-1 gap-4">
                <div>
                   <label className="text-xs text-gray-500">回复邮箱 (Reply-To)</label>
                   <input 
                     name="senderEmail" 
                     value={formData.senderEmail} 
                     onChange={handleChange} 
                     placeholder={formData.smtpUser ? `默认为: ${formData.smtpUser}` : "HR 回复时收信的邮箱"}
                     className="w-full p-2 border rounded text-sm"
                   />
                </div>
                <div>
                   <label className="text-xs text-gray-500 mb-1 block">邮件正文模板 (支持 HTML)</label>
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
              <h4 className="font-semibold border-b pb-2">基础信息 (用于 AI 生成)</h4>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500">姓名</label>
                    <input name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">本科院校</label>
                    <input name="undergrad" value={formData.undergrad} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-bold text-indigo-600">本科专业</label>
                    <input name="undergradMajor" value={formData.undergradMajor} onChange={handleChange} className="w-full p-2 border border-indigo-200 rounded"/>
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