'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow, type Locale } from 'date-fns'
import { it, enUS, fr, de, es } from 'date-fns/locale'
import { MessageCircle } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

const DATE_FNS_LOCALES: Record<string, Locale> = { it, en: enUS, fr, de, es }

export default function BusinessChatList() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: u } = await supabase.from('users').select('id, full_name').eq('auth_id', session.user.id).single()
      setUser(u)
      if (u) loadConversations(u.id)
    })
  }, [])

  const loadConversations = async (uid: string) => {
    setLoading(true)
    const { data: missions } = await supabase.from('missions')
      .select(`
        id, title, status, client_id, provider_id,
        category:service_categories(icon),
        client:users!missions_client_id_fkey(id, full_name),
        provider:users!missions_provider_id_fkey(id, full_name)
      `)
      .eq('provider_id', uid)
      .not('provider_id', 'is', null)
      .in('status', ['matched','confirmed','in_progress','completed','reviewed'])
      .order('created_at', { ascending: false })

    if (!missions?.length) { setConversations([]); setLoading(false); return }

    const convs = await Promise.all(missions.map(async (m) => {
      const otherUser = m.client as any
      const { data: lastMsg } = await supabase.from('messages')
        .select('content, sender_id, created_at, read_at')
        .eq('mission_id', m.id).order('created_at', { ascending: false }).limit(1)
      const { count: unread } = await supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('mission_id', m.id).eq('receiver_id', uid).is('read_at', null)
      return {
        missionId: m.id, missionTitle: m.title,
        missionIcon: (m.category as any)?.icon ?? '📦',
        otherUser, lastMessage: lastMsg?.[0] ?? null, unreadCount: unread ?? 0
      }
    }))

    convs.sort((a, b) => (b.lastMessage?.created_at ?? '0').localeCompare(a.lastMessage?.created_at ?? '0'))
    setConversations(convs)
    setLoading(false)
  }

  const initials = (name?: string) =>
    (name ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('navChat')} {totalUnread > 0 && <span style={{color:'#5B2D8E'}} className="text-xl">({totalUnread})</span>}
        </h1>
        <button onClick={() => user && loadConversations(user.id)} className="btn-outline py-2 px-4 text-sm">↻</button>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:'#5B2D8E',borderTopColor:'transparent'}} /></div>
      ) : conversations.length === 0 ? (
        <div className="card text-center py-16">
          <MessageCircle className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">{t('chatEmptyState')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <button key={conv.missionId}
              onClick={() => router.push(`/business/chat/${conv.missionId}`)}
              className="card w-full text-left flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-semibold" style={{background:'#5B2D8E'}}>
                {initials(conv.otherUser?.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900 truncate">{conv.otherUser?.full_name ?? '—'}</p>
                  {conv.lastMessage && (
                    <p className="text-xs text-gray-400 ml-2">
                      {formatDistanceToNow(new Date(conv.lastMessage.created_at), { locale: DATE_FNS_LOCALES[lang] ?? enUS, addSuffix: true })}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{conv.missionIcon} {conv.missionTitle}</p>
                {conv.lastMessage ? (
                  <p className={`text-sm truncate mt-0.5 ${conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                    {conv.lastMessage.sender_id === user?.id ? t('chatYouPrefix') : ''}{conv.lastMessage.content}
                  </p>
                ) : <p className="text-sm text-gray-400 italic mt-0.5">{t('chatWriteFirst')}</p>}
              </div>
              {conv.unreadCount > 0 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{background:'#5B2D8E'}}>
                  {conv.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
