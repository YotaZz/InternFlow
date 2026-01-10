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
          <h3 className="text-lg font-bold text-white">设置</h3>
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

          {/* EmailJS */}
          <div className="bg-orange-50 p-4 rounded border border-orange-200">
             <label className="block text-sm font-bold text-orange-900 mb-2">EmailJS 配置</label>
             <div className="grid grid-cols-2 gap-4">
                <input name="emailjsServiceId" value={formData.emailjsServiceId} onChange={handleChange} placeholder="Service ID" className="p-2 border rounded text-sm"/>
                <input name="emailjsTemplateId" value={formData.emailjsTemplateId} onChange={handleChange} placeholder="Template ID" className="p-2 border rounded text-sm"/>
                <input name="emailjsPublicKey" value={formData.emailjsPublicKey} onChange={handleChange} placeholder="Public Key" className="p-2 border rounded text-sm"/>
                <input name="senderEmail" value={formData.senderEmail} onChange={handleChange} placeholder="发送者邮箱 (Reply-To / From)" className="p-2 border rounded text-sm"/>
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
                    <label className="text-xs text-gray-500">硕士院校</label>
                    <input name="master" value={formData.master || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">硕士专业</label>
                    <input name="masterMajor" value={formData.masterMajor || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">毕业年份 (如 2027)</label>
                    <input name="masterYear" value={formData.masterYear || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">当前年级 (如 研0)</label>
                    <input name="currentGrade" value={formData.currentGrade || ''} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">实习时长 (如 6个月)</label>
                    <input name="availability" value={formData.availability} onChange={handleChange} className="w-full p-2 border rounded"/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">出勤频率 (如 每周5天)</label>
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