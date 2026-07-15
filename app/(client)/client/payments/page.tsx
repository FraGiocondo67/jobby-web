'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

// Servizi di pagamento JOBBY — integrazione con partner specializzati
const PAYMENT_SERVICES = [
  {
    id: 'remittance',
    icon: '🌍',
    color: '#0ea5e9',
    bg: '#e0f2fe',
    titleKey: 'paymentsRemittanceTitle',
    subtitleKey: 'paymentsRemittanceSubtitle',
    descriptionKey: 'paymentsRemittanceDescription',
    questions: 3,
    available: false,
  },
  {
    id: 'topup',
    icon: '📱',
    color: '#8b5cf6',
    bg: '#ede9fe',
    titleKey: 'paymentsTopupTitle',
    subtitleKey: 'paymentsTopupSubtitle',
    descriptionKey: 'paymentsTopupDescription',
    questions: 2,
    available: false,
  },
  {
    id: 'bills',
    icon: '🧾',
    color: '#f59e0b',
    bg: '#fef3c7',
    titleKey: 'paymentsBillsTitle',
    subtitleKey: 'paymentsBillsSubtitle',
    descriptionKey: 'paymentsBillsDescription',
    questions: 2,
    available: false,
  },
  {
    id: 'p2p',
    icon: '🔄',
    color: '#10b981',
    bg: '#d1fae5',
    titleKey: 'paymentsP2pTitle',
    subtitleKey: 'paymentsP2pSubtitle',
    descriptionKey: 'paymentsP2pDescription',
    questions: 2,
    available: false,
  },
]

export default function PaymentsPage() {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={20}/>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💳 {t('paymentsTitle')}</h1>
          <p className="text-gray-500 text-sm">{t('paymentsSubtitle')}</p>
        </div>
      </div>

      {/* Hero */}
      <div className="card text-center py-8" style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'none'}}>
        <div className="text-5xl mb-3">💳</div>
        <h2 className="text-xl font-bold text-gray-900">{t('paymentsHeroTitle')}</h2>
        <p className="text-gray-500 text-sm mt-1">{t('paymentsHeroSubtitle')}</p>
        <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-xs font-semibold" style={{background:'#bbf7d0',color:'#065f46'}}>
          🔒 {t('paymentsSecureBadge')}
        </div>
      </div>

      {/* Servizi */}
      <div className="space-y-3">
        {PAYMENT_SERVICES.map(service => (
          <div key={service.id}
            className="card flex items-center gap-4 cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
            onClick={() => !service.available && null}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{background: service.bg}}>
              {service.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900">{t(service.titleKey)}</p>
                {!service.available && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:'#fef3c7',color:'#92400e'}}>
                    {t('paymentsComingSoon')}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{service.questions} {t('paymentsQuickQuestions')}</p>
              <p className="text-sm text-gray-600 mt-1">{t(service.descriptionKey)}</p>
            </div>
            <ArrowRight size={20} style={{color: service.color}} className="flex-shrink-0"/>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="card" style={{background:'#f8fafc',border:'none'}}>
        <p className="text-xs text-gray-500 text-center">
          {t('paymentsInfoText')}{' '}
          <span style={{color:'#1A73E8'}} className="cursor-pointer">{t('paymentsLearnMore')}</span>
        </p>
      </div>
    </div>
  )
}
