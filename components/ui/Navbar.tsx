'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LogOut, Bell } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

interface NavbarProps {
  role: 'client' | 'provider' | 'business'
  userName?: string
  avatarUrl?: string | null
  unreadCount?: number
}

const NAV_LINKS: Record<string, { href: string; icon: string; key: string }[]> = {
  client: [
    { href: '/client', icon: '🏠', key: 'navHome' },
    { href: '/client/missions', icon: '📋', key: 'navRequests' },
    { href: '/client/map', icon: '🗺️', key: 'navMap' },
    { href: '/client/payments', icon: '💳', key: 'navPayments' },
    { href: '/client/wallet', icon: '💼', key: 'navWallet' },
    { href: '/client/chat', icon: '💬', key: 'navChat' },
    { href: '/client/profile', icon: '👤', key: 'navProfile' },
  ],
  provider: [
    { href: '/provider', icon: '🏠', key: 'navHome' },
    { href: '/provider/missions', icon: '📋', key: 'navMissions' },
    { href: '/provider/payments', icon: '💳', key: 'navPayments' },
    { href: '/provider/wallet', icon: '💼', key: 'navWallet' },
    { href: '/provider/chat', icon: '💬', key: 'navChat' },
    { href: '/provider/profile', icon: '🛡️', key: 'navProfile' },
  ],
  business: [
    { href: '/business', icon: '🏠', key: 'navDashboard' },
    { href: '/business/orders', icon: '📦', key: 'navOrders' },
    { href: '/business/payments', icon: '💳', key: 'navPayments' },
    { href: '/business/wallet', icon: '💼', key: 'navWallet' },
    { href: '/business/chat', icon: '💬', key: 'navChat' },
    { href: '/business/profile', icon: '🏪', key: 'navProfile' },
  ],
}

const ROLE_COLORS: Record<string, string> = {
  client:   '#E25C45',
  provider: '#1A73E8',
  business: '#5B2D8E',
}

const ROLE_LABEL_KEYS: Record<string, string> = {
  client:   'roleClient',
  provider: 'roleProvider',
  business: 'roleBusiness',
}

export default function Navbar({ role, userName, avatarUrl, unreadCount = 0 }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { t } = useLanguage()
  const links = NAV_LINKS[role]
  const color = ROLE_COLORS[role]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = (name?: string) =>
    (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === href : pathname.startsWith(href)

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${role}`} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/jobby-icon.png" alt="JOBBY" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-xl text-gray-900">JOBBY</span>
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full"
              style={{background: color}}>
              {t(ROLE_LABEL_KEYS[role])}
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                style={isActive(link.href)
                  ? {background: color + '15', color}
                  : {color:'#6b7280'}}>
                {link.icon} {t(link.key)}
              </Link>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <Bell size={20}/>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center"
                  style={{background: color}}>
                  {unreadCount}
                </span>
              )}
            </button>
            {userName && (
              <div className="hidden md:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                  style={{background: color}}>
                  {avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    : initials(userName)}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden xl:block">
                  {userName.split(' ')[0]}
                </span>
              </div>
            )}
            <button onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut size={18}/>
            </button>
          </div>
        </div>

        {/* Mobile nav — scrollabile */}
        <div className="lg:hidden flex overflow-x-auto gap-1 pb-2 -mx-4 px-4 scrollbar-hide">
          {links.map(link => (
            <Link key={link.href} href={link.href}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={isActive(link.href)
                ? {background: color + '15', color}
                : {color:'#6b7280'}}>
              {link.icon} {t(link.key)}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
