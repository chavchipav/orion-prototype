// ─────────────────────────────────────────────────────────────
// Орион — прокси для ИИ-ассистента (ChatGPT).
// Ключ OpenAI хранится в секрете воркера (env.OPENAI_API_KEY) и НИКОГДА
// не попадает в браузер. Фронт ходит сюда, воркер подставляет ключ.
// Деплой: см. README.md рядом.
// ─────────────────────────────────────────────────────────────

// Кто может обращаться к прокси. Поставьте ваш домен; '*' — разрешить всем.
const ALLOW_ORIGINS = ['https://atsesl1.github.io']
// Разрешённые модели (защита от случайных дорогих запросов).
const MODELS = ['gpt-4o-mini', 'gpt-4o']

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || ''
    const allow = ALLOW_ORIGINS.includes('*') ? '*' : (ALLOW_ORIGINS.includes(origin) ? origin : ALLOW_ORIGINS[0])
    const cors = {
      'Access-Control-Allow-Origin': allow,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (req.method !== 'POST') return j({ error: { message: 'Method Not Allowed' } }, 405, cors)
    if (!env.OPENAI_API_KEY) return j({ error: { message: 'OPENAI_API_KEY не задан в секретах воркера' } }, 500, cors)

    let body
    try { body = await req.json() } catch { return j({ error: { message: 'bad json' } }, 400, cors) }
    const model = MODELS.includes(body.model) ? body.model : 'gpt-4o-mini'
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : []
    const max_tokens = Math.min(Number(body.max_tokens) || 450, 700)

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens }),
    })
    const text = await r.text()
    return new Response(text, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } })
  },
}

function j(o, status, cors) { return new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } }) }
