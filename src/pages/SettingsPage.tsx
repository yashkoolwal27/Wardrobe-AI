import { useState, useEffect } from 'react';
import { useWardrobeStore } from '../store/wardrobeStore';
import { getGeminiApiKey } from '../lib/gemini';
import { PageTransition } from '../components/layout/PageTransition';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Key, Eye, EyeOff, BookOpen, AlertCircle, Check } from 'lucide-react';

export function SettingsPage() {
  const { geminiApiKey, setGeminiApiKey, addToast } = useWardrobeStore();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setApiKeyInput(geminiApiKey || getGeminiApiKey() || '');
  }, [geminiApiKey]);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    
    setValidating(true);
    // Simple basic regex check for Google AI API Key format
    if (cleanKey && !cleanKey.startsWith('AIzaSy')) {
      addToast({ type: 'warning', title: 'Invalid Key Format', message: 'Google Gemini API keys usually start with AIzaSy.' });
      setValidating(false);
      return;
    }

    setGeminiApiKey(cleanKey);
    addToast({
      type: 'success',
      title: 'Settings saved',
      message: cleanKey ? 'Gemini API Key configured and stored locally.' : 'API Key cleared.',
    });
    setValidating(false);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl flex flex-col gap-6">
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-subtitle">Configure integrations and manage credentials.</p>
        </div>

        <div className="divider-gold" />

        {/* Gemini Configuration Box */}
        <GlassPanel variant="heavy" className="p-6 border-white/5 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 shrink-0">
                <Key size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-ivory-200">Gemini API Key</span>
                <span className="text-xs text-charcoal-400 mt-0.5">Stored locally in your browser. Never sent to our servers.</span>
              </div>
            </div>
            {geminiApiKey ? (
              <Badge variant="gold" icon={<Check size={10} />}>Configured</Badge>
            ) : (
              <Badge variant="red">Missing Key</Badge>
            )}
          </div>

          <form onSubmit={handleSaveApiKey} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Google AI Developer Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="input-glass pr-12 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-3.5 text-charcoal-400 hover:text-ivory-300 transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={validating}
              className="self-end"
            >
              Save API Key
            </Button>
          </form>
        </GlassPanel>

        {/* Setup Guide */}
        <GlassPanel className="p-6 border-white/5 flex flex-col gap-4">
          <h3 className="font-display text-base font-semibold text-gradient-gold flex items-center gap-2">
            <BookOpen size={16} /> Setup & Instructions
          </h3>
          <div className="flex flex-col gap-3 text-xs text-charcoal-400 leading-relaxed">
            <p>
              Wardrobe AI utilizes the Google Gemini API to analyze uploaded item images and composite/style generated outfits. To run the app fully, you will need a Gemini developer key.
            </p>
            <div className="glass p-4 border-white/5 flex flex-col gap-2">
              <span className="font-semibold text-ivory-300">How to get a free API Key:</span>
              <ol className="list-decimal list-inside flex flex-col gap-1 text-[11px] text-charcoal-400">
                <li>Go to the <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-gold-400 hover:underline">Google AI Studio</a> portal.</li>
                <li>Sign in with your Google account.</li>
                <li>Click <strong>"Get API Key"</strong> on the side menu.</li>
                <li>Create a key for a new or existing Google Cloud project.</li>
                <li>Copy the key and paste it in the field above!</li>
              </ol>
            </div>
            <div className="flex gap-2 items-start text-amber-400/80 bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl mt-1">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed">
                Google AI Studio keys are subject to free tier rate limits (15 RPM / 1,500 RPD). If you upload items rapidly, you might encounter a rate limit error. Wait a few seconds and try again.
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </PageTransition>
  );
}
export default SettingsPage;
