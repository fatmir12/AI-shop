import { t } from "../i18n/bs.js";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
export default function AIAssistantBar() {
  const [input, setInput] = useState('');
  const navigate = useNavigate();
  return <section className="assistant-bar"><form className="container" onSubmit={event => {
      event.preventDefault();
      const prompt = input.trim();
      if (!prompt) return;
      navigate('/assistant', {
        state: {
          assistantRequest: {
            id: crypto.randomUUID(),
            prompt
          }
        }
      });
      setInput('');
    }}><strong>{t("Dobar dan! Kako vam mogu pomo\u0107i?")}</strong><div><label className="sr-only" htmlFor="assistant-bar-input">{t("Pitanje AI asistentu")}</label><input id="assistant-bar-input" value={input} maxLength={1000} onChange={event => setInput(event.target.value)} placeholder={t("Pitajte AI asistenta za pomoć pri kupovini...")} /><button aria-label={t("Po\u0161alji pitanje")} disabled={!input.trim()}><ArrowRight size={20} /></button></div></form></section>;
}
