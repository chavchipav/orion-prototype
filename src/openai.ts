// ─────────────────────────────────────────────────────────────
// Лёгкий клиент OpenAI (ChatGPT) для ассистента.
// ВАЖНО: ключ НЕ хранится в коде/репозитории. Пользователь вводит его в UI,
// он лежит только в localStorage браузера. Для продакшна нужен бэкенд-прокси
// (ключ в браузере виден в Network) — здесь это демо-прототип.
// ─────────────────────────────────────────────────────────────
const KEY_LS = 'ya_openai_key'
const MODEL_LS = 'ya_openai_model'
export const DEFAULT_MODEL = 'gpt-4o-mini'

// ключ из UI (localStorage) имеет приоритет; иначе — из .env.local (VITE_OPENAI_API_KEY),
// чтобы при старте dev-сервера Ассистент сразу был подключён без ручного ввода.
const ENV_KEY: string = ((import.meta as { env?: Record<string, string> }).env?.VITE_OPENAI_API_KEY) || ''
export const getKey = (): string => { try { return localStorage.getItem(KEY_LS) || ENV_KEY } catch { return ENV_KEY } }
export const setKey = (k: string) => { try { k ? localStorage.setItem(KEY_LS, k.trim()) : localStorage.removeItem(KEY_LS) } catch { /* ignore */ } }
export const getModel = (): string => { try { return localStorage.getItem(MODEL_LS) || DEFAULT_MODEL } catch { return DEFAULT_MODEL } }
export const setModel = (m: string) => { try { localStorage.setItem(MODEL_LS, m) } catch { /* ignore */ } }

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string }

export async function chatOpenAI(messages: ChatMsg[], key: string, model = getModel()): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 450 }),
  })
  if (!res.ok) {
    let detail = ''
    try { const e = await res.json(); detail = e?.error?.message || '' } catch { /* ignore */ }
    throw new Error(`OpenAI ${res.status}${detail ? ': ' + detail : ''}`)
  }
  const data = await res.json()
  return (data?.choices?.[0]?.message?.content || '').trim() || '—'
}
