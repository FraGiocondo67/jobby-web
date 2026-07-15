'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Send } from 'lucide-react'

export default function ProviderChatDetail() {
  const params = useParams()
  const router = useRouter()
  const missionId = params.missionId as string
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [conv, setConv] = useState<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      setUser(u)
      if (u && missionId) {
        const { data: mission } = await supabase.from('missions')
          .select('id, title, client_id, provider_id, category:service_categories(icon)').eq('id', missionId).single()
        if (mission) {
          const otherUserId = u.id === mission.client_id ? mission.provider_id : mission.client_id
          const { data: otherUser } = await supabase.from('users').select('id, full_name').eq('id', otherUserId).maybeSingle()
          setConv({ ...mission, otherUser })
        }
        const { data: msgs } = await supabase.from('messages')
          .select('*').eq('mission_id', missionId).order('created_at', { ascending: true })
        setMessages(msgs ?? [])
        setLoading(false)
        await supabase.from('messages').update({ read_at: new Date().toISOString() })
          .eq('mission_id', missionId).eq('receiver_id', u.id).is('read_at', null)
        channelRef.current = supabase.channel(`chat-p:${missionId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages',
            filter: `mission_id=eq.${missionId}` }, (payload) => {
            setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
            if (payload.new.receiver_id === u.id)
              supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('id', payload.new.id)
          }).subscribe()
      }
    })
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [missionId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !user || !conv || sending) return
    setSending(true); setInput('')
    try {
      await supabase.from('messages').insert({
        mission_id: missionId, sender_id: user.id, receiver_id: conv.otherUser?.id, content: text,
      })
    } catch { setInput(text) } finally { setSending(false) }
  }

  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const initials = (name?: string) => (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -my-8 -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20} /></button>
        <div className="w-10 h-10 bg-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {initials(conv?.otherUser?.full_name)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{conv?.otherUser?.full_name ?? '—'}</p>
          <p className="text-xs text-gray-500">{conv?.category?.icon} {conv?.title}</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
        {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-blue border-t-transparent rounded-full animate-spin" /></div>
          : messages.length === 0 ? <div className="text-center py-12"><p className="text-4xl mb-2">👋</p><p className="text-gray-500 text-sm">Scrivi per primo!</p></div>
          : messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id
            const showTime = i === 0 || fmtTime(msg.created_at) !== fmtTime(messages[i-1].created_at)
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[75%]">
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${isMe ? 'bg-blue text-white rounded-br-sm' : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                  {showTime && <p className={`text-xs text-gray-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {fmtTime(msg.created_at)}{isMe && (msg.read_at ? ' ✓✓' : ' ✓')}
                  </p>}
                </div>
              </div>
            )
          })}
      </div>
      <div className="bg-white border-t p-4">
        <div className="flex items-end gap-3">
          <textarea className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue max-h-32"
            rows={1} placeholder="Scrivi..." value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className={`p-3 rounded-xl ${input.trim() && !sending ? 'bg-blue text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
