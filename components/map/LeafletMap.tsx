'use client'
import { useEffect, useRef } from 'react'

export interface MapMarker {
  id: string; lat: number; lng: number
  type: 'provider' | 'proximity' | 'mission' | 'user'
  title: string; subtitle?: string; icon?: string; color?: string
  onClick?: () => void
}

interface Props {
  center: [number, number]; zoom?: number
  markers: MapMarker[]; height?: string
}

const MARKER_COLORS: Record<string, string> = {
  provider: '#1A73E8', proximity: '#5B2D8E', mission: '#E25C45', user: '#1D9E75',
}

export default function LeafletMap({ center, zoom = 13, markers, height = '500px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const LRef = useRef<any>(null)

  useEffect(() => {
    let destroyed = false

    import('leaflet').then(L => {
      if (destroyed || !containerRef.current) return

      // Evita doppia inizializzazione (StrictMode)
      if ((containerRef.current as any)._leaflet_id) return

      LRef.current = L
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      map.setView(center, zoom)
      renderMarkers(L, map, markers)
    })

    return () => {
      destroyed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // eslint-disable-line

  // Aggiorna markers
  useEffect(() => {
    if (!mapRef.current || !LRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    renderMarkers(LRef.current, mapRef.current, markers)
  }, [markers])

  // Aggiorna center
  useEffect(() => {
    if (mapRef.current) mapRef.current.setView(center, zoom)
  }, [center, zoom])

  function renderMarkers(L: any, map: any, list: MapMarker[]) {
    list.forEach(m => {
      const color = m.color ?? MARKER_COLORS[m.type] ?? '#666'
      const emoji = m.icon ?? (m.type==='user'?'📍':m.type==='proximity'?'🏪':m.type==='mission'?'📋':'👤')

      const icon = L.divIcon({
        html: `<div style="background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);width:36px;height:36px;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(45deg);font-size:16px;line-height:1">${emoji}</span></div>`,
        iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36], className: '',
      })

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;min-width:150px;padding:4px">
          <p style="font-weight:700;font-size:14px;margin:0 0 4px">${m.title}</p>
          ${m.subtitle ? `<p style="color:#6b7280;font-size:12px;margin:0">${m.subtitle}</p>` : ''}
          ${m.onClick ? `<button onclick="window._jmc_${m.id}()" style="margin-top:8px;background:${color};color:white;border:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;width:100%">Vedi dettagli →</button>` : ''}
        </div>`, { maxWidth: 220 })

      if (m.onClick) {
        ;(window as any)[`_jmc_${m.id}`] = m.onClick
      }
      markersRef.current.push(marker)
    })
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
      <div ref={containerRef} style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden', zIndex: 0 }}/>
    </>
  )
}
