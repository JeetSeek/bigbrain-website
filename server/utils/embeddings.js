import OpenAI from 'openai'

const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

let client = null
function getClient() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY in server/.env for embeddings')
    client = new OpenAI({ apiKey })
  }
  return client
}

export async function embedTexts(texts = []) {
  if (!Array.isArray(texts) || texts.length === 0) return []
  const client = getClient()
  const input = texts.map((t) => String(t || '').slice(0, 6000))
  const res = await client.embeddings.create({ model: MODEL, input })
  return res.data.map((d) => d.embedding)
}

export async function embedText(text) {
  const [e] = await embedTexts([text])
  return e
}

export const embeddingModel = MODEL
