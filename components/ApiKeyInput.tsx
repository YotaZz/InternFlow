import React, { useState, useEffect } from 'react';

interface ApiKeyInputProps {
  onApiKeySet: (key: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySet }) => {
  const [key, setKey] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // 修改处：使用 import.meta.env 读取 Vite 环境变量
    // 变量名必须以 VITE_ 开头才能暴露给前端
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (envKey) {
      onApiKeySet(envKey);
      setIsOpen(false);
      return;
    }
    
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setKey(storedKey);
      onApiKeySet(storedKey);
      setIsOpen(false);
    }
  }, [onApiKeySet]);

  const handleSave = () => {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim());
      onApiKeySet(key.trim());
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="text-xs text-gray-400 hover:text-indigo-500 underline"
        >
            配置 API Key
        </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">🔑 输入 Gemini API Key</h2>
        <p className="text-sm text-gray-600 mb-4">
          要使用 AI 解析功能，请提供有效的 Google GenAI API Key。
          <br/>
          <span className="text-xs text-yellow-600">注意：密钥将仅保存在您的本地浏览器缓存中。</span>
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
        />
        <div className="flex justify-end gap-2">
            <button
                onClick={() => handleSave()}
                disabled={!key.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors font-medium"
            >
                保存并继续
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;
