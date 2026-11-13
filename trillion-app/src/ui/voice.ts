/** Thin wrappers over the browser's speech recognition and speech synthesis. */
type Rec = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: any) => void) | null
  onerror: ((e: any) => void) | null
  onend: (() => void) | null
  start(): void
  abort(): void
}

const RecCtor: (new () => Rec) | undefined =
  typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : undefined

export const canListen = !!RecCtor
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

export function listen(on: { interim?: (text: string) => void; final: (text: string) => void; error: (why: string) => void; end: () => void }): () => void {
  if (!RecCtor) {
    on.error('unsupported')
    on.end()
    return () => {}
  }
  const rec = new RecCtor()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.maxAlternatives = 1
  let done = false
  rec.onresult = (e) => {
    const r = e.results[e.results.length - 1]
    const text = String(r[0].transcript).trim()
    if (r.isFinal) {
      done = true
      on.final(text)
    } else on.interim?.(text)
  }
  rec.onerror = (e) => on.error(String(e.error ?? 'error'))
  rec.onend = () => {
    if (!done) on.final('')
    on.end()
  }
  try {
    rec.start()
  } catch {
    on.error('busy')
    on.end()
  }
  return () => rec.abort()
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
  const prefer = ['Google UK English Male', 'Daniel', 'Microsoft Ryan', 'Arthur', 'Google UK English Female', 'Samantha']
  for (const name of prefer) {
    const v = voices.find((x) => x.name.includes(name))
    if (v) return v
  }
  return voices.find((v) => v.lang === 'en-GB') ?? voices[0]
}

export function speak(text: string, onEnd: () => void): () => void {
  if (!canSpeak) {
    onEnd()
    return () => {}
  }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = pickVoice()
  if (v) u.voice = v
  u.rate = 1.03
  u.pitch = 0.92
  u.onend = onEnd
  u.onerror = onEnd
  speechSynthesis.speak(u)
  return () => speechSynthesis.cancel()
}
