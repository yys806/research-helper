import React, { useEffect, useState } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { getApiKey, setApiKey } from '../services/apiKeyStore';

export const ApiKeyBar: React.FC = () => {
  const [apiKey, setApiKeyState] = useState<string>('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getApiKey();
    if (existing) setApiKeyState(existing);
  }, []);

  const handleSave = () => {
    setApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-amber-800 text-sm">
        <KeyRound className="w-4 h-4" />
        <span>
          填入 <a className="underline font-medium" href="https://cloud.siliconflow.cn/me/account/ak" target="_blank" rel="noreferrer">SiliconFlow API Key</a>，仅保存在本地浏览器。
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKeyState(e.target.value)}
          placeholder="sk-..."
          className="w-64 md:w-80 px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 text-sm bg-white shadow-inner"
        />
        <button
          onClick={handleSave}
          className="px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg shadow hover:bg-amber-700 active:scale-95 transition"
        >
          保存
        </button>
        {saved && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
      </div>
    </div>
  );
};

