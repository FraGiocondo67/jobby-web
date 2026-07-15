'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PaymentServices from '@/components/ui/PaymentServices'
import { useLanguage } from '@/lib/i18n'

export default function ProviderPayments() {
  const { t } = useLanguage()
  const router = useRouter()
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={20}/></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('paymentsTitle')}</h1>
          <p className="text-gray-500 text-sm">{t('paymentsSubtitle')}</p>
        </div>
      </div>
      <PaymentServices paymentsHref="/provider/payments"/>
    </div>
  )
}
