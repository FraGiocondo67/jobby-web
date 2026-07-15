'use client'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const PAYMENT_SERVICES = [
  { icon: '🌍', name: 'Manda soldi all\'estero', color: '#0ea5e9', bg: '#e0f2fe', desc: '3 domande rapide' },
  { icon: '📱', name: 'Ricarica Telefonica', color: '#8b5cf6', bg: '#ede9fe', desc: '2 domande rapide' },
  { icon: '🧾', name: 'Paga Bollette', color: '#f59e0b', bg: '#fef3c7', desc: '2 domande rapide' },
  { icon: '🔄', name: 'Manda e Richiedi Soldi', color: '#10b981', bg: '#d1fae5', desc: '2 domande rapide' },
]

interface Props {
  paymentsHref: string
  compact?: boolean
}

export default function PaymentServices({ paymentsHref, compact = false }: Props) {
  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">💳 Pagamenti</h2>
            <p className="text-xs text-gray-500 mt-0.5">Seleziona il servizio specifico</p>
          </div>
          <Link href={paymentsHref} className="text-sm font-medium flex items-center gap-1" style={{color:'#E25C45'}}>
            Tutti <ArrowRight size={14}/>
          </Link>
        </div>
        <div className="space-y-2">
          {PAYMENT_SERVICES.map(svc => (
            <Link key={svc.name} href={paymentsHref}
              className="card flex items-center gap-4 hover:shadow-md transition-all"
              style={{padding:'0.875rem'}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{background: svc.bg}}>{svc.icon}</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{svc.name}</p>
                <p className="text-xs mt-0.5" style={{color:'#f59e0b'}}>Presto disponibile</p>
              </div>
              <ArrowRight size={16} style={{color: svc.color}}/>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card text-center py-8" style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'none'}}>
        <div className="text-5xl mb-3">💳</div>
        <h2 className="text-xl font-bold text-gray-900">Servizi Finanziari JOBBY</h2>
        <p className="text-gray-500 text-sm mt-1">Powered by partner certificati</p>
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{background:'#bbf7d0',color:'#065f46'}}>
          🔒 Transazioni sicure e certificate
        </div>
      </div>
      <div className="space-y-3">
        {PAYMENT_SERVICES.map(svc => (
          <div key={svc.name} className="card flex items-center gap-4 hover:shadow-md transition-all" style={{padding:'1rem'}}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{background: svc.bg}}>{svc.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{svc.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:'#fef3c7',color:'#92400e'}}>
                  Presto disponibile
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{svc.desc}</p>
            </div>
            <ArrowRight size={20} style={{color: svc.color}} className="flex-shrink-0"/>
          </div>
        ))}
      </div>
      <div className="card" style={{background:'#f8fafc',border:'none'}}>
        <p className="text-xs text-gray-500 text-center">
          I servizi di pagamento JOBBY sono gestiti in partnership con istituti finanziari autorizzati.{' '}
          <span style={{color:'#1A73E8'}} className="cursor-pointer">Scopri di più →</span>
        </p>
      </div>
    </div>
  )
}
