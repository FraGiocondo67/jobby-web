'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Camera } from 'lucide-react'

interface Props {
  userId: string
  authId: string
  avatarUrl?: string | null
  fullName?: string
  color?: string
  size?: number
  onUploaded: (url: string) => void
}

// Upload diretto su Supabase Storage (bucket "avatars", pubblico in lettura, scritture
// vincolate via RLS a auth.uid() = primo segmento del path). Aggiorna anche users.avatar_url.
export default function AvatarUpload({ userId, authId, avatarUrl, fullName, color = '#E25C45', size = 72, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const initials = (fullName ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Seleziona un file immagine'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Immagine troppo grande (max 5MB)'); return }
    setUploading(true); setError('')
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${authId}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) throw new Error(upErr.message)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', userId)
      if (dbErr) throw new Error(dbErr.message)
      onUploaded(publicUrl)
    } catch (e: any) {
      setError(e.message || 'Errore durante il caricamento')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, background: color, fontSize: size * 0.34 }}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Foto profilo" className="w-full h-full object-cover" />
        ) : initials}
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border-2 flex items-center gap-1.5 disabled:opacity-50"
        style={{ borderColor: color, color }}>
        <Camera size={13} /> {uploading ? 'Caricamento...' : 'Cambia foto'}
      </button>
      {error && <p className="text-xs text-red-600 text-center max-w-[10rem]">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}
