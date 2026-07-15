'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Props {
  currentRole: 'client' | 'provider' | 'both'
  userId: string
  isProximity?: boolean
}

export default function RoleSection({ currentRole, userId, isProximity }: Props) {
  const router = useRouter()
  const [upgrading, setUpgrading] = useState(false)
  const [done, setDone] = useState(false)

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/auth/upgrade-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ role: 'both' }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true)
        setTimeout(() => router.refresh(), 1500)
      } else {
        alert(data.error || 'Errore upgrade ruolo')
      }
    } catch (e) {
      alert('Errore di connessione')
    } finally {
      setUpgrading(false)
    }
  }

  if (currentRole === 'both') {
    return (
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-900 text-xs uppercase tracking-widest text-gray-400">I tuoi ruoli su JOBBY</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl border-2" style={{borderColor:'#fca5a5',background:'#fff7f5'}}>
            <span className="text-2xl">🔍</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Cliente</p>
              <p className="text-xs text-green-600">✓ Attivo</p>
            </div>
            <button onClick={() => router.push('/client')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{background:'#E25C45',color:'#fff'}}>
              Vai →
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border-2"
            style={{borderColor: isProximity?'#c4b5fd':'#93c5fd', background: isProximity?'#faf5ff':'#f0f7ff'}}>
            <span className="text-2xl">{isProximity?'🏪':'⚡'}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{isProximity?'Attività di Prossimità':'Fornitore Servizi'}</p>
              <p className="text-xs text-green-600">✓ Attivo</p>
            </div>
            <button onClick={() => router.push(isProximity?'/business':'/provider')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
              style={{background: isProximity?'#5B2D8E':'#1A73E8'}}>
              Vai →
            </button>
          </div>
        </div>
        <p className="text-xs text-center text-gray-400">
          Passa da un ruolo all'altro dalla{' '}
          <button onClick={() => router.push('/')} className="underline" style={{color:'#E25C45'}}>schermata principale</button>
        </p>
      </div>
    )
  }

  const isClient = currentRole === 'client'

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-gray-900 text-xs uppercase tracking-widest" style={{color:'#9ca3af'}}>I tuoi ruoli su JOBBY</h2>

      {/* Ruolo attivo */}
      <div className="flex items-center gap-3 p-3 rounded-xl border-2"
        style={isClient?{borderColor:'#fca5a5',background:'#fff7f5'}:{borderColor:'#93c5fd',background:'#f0f7ff'}}>
        <span className="text-2xl">{isClient?'🔍':'⚡'}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">{isClient?'Cliente':'Fornitore Servizi'}</p>
          <p className="text-xs text-green-600">✓ Attivo</p>
        </div>
      </div>

      {/* Ruolo non attivo */}
      <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed" style={{borderColor:'#e5e7eb',background:'#f9fafb'}}>
        <span className="text-2xl opacity-40">{isClient?'⚡':'🔍'}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-400">{isClient?'Fornitore Servizi':'Cliente'}</p>
          <p className="text-xs text-gray-400">Non attivo</p>
        </div>
      </div>

      {/* CTA upgrade */}
      {done ? (
        <div className="py-3 text-center text-green-600 font-semibold text-sm">
          ✅ Ruolo aggiunto! Aggiornamento in corso...
        </div>
      ) : (
        <button onClick={handleUpgrade} disabled={upgrading}
          className="w-full py-4 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
          style={{background: isClient?'#1A73E8':'#E25C45'}}>
          {upgrading ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Attivazione...</>
          ) : (
            <><span className="text-xl">{isClient?'⚡':'🔍'}</span> + Diventa anche {isClient?'Fornitore Servizi':'Cliente'}</>
          )}
        </button>
      )}
    </div>
  )
}
