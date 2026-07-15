'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single()
      if (!data || (data.role !== 'provider' && data.role !== 'both')) {
        router.push('/client'); return
      }
      setUser(data)
      setLoading(false)
    })
  }, [router])

  if (loading) return <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-blue border-t-transparent rounded-full animate-spin" />
  </div>

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="provider" userName={user?.full_name} avatarUrl={user?.avatar_url} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
