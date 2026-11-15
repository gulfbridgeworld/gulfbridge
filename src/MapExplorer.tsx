import { useEffect, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Job } from './data'
import { formatMoney } from './data'
import 'leaflet/dist/leaflet.css'

type Props = {
  jobs: Job[]
  onSelectJob: (job: Job) => void
  isArabic: boolean
}

type SearchResult = {
  lat: string
  lon: string
  display_name: string
}

const markerIcon = L.divIcon({
  className: 'gulfbridge-map-marker',
  html: '<span class="map-marker-pulse"><span></span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function MapFocus({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, 11, { duration: 1.15 })
  }, [center, map])
  return null
}

export default function MapExplorer({ jobs, onSelectJob, isArabic }: Props) {
  const [query, setQuery] = useState('')
  const [center, setCenter] = useState<[number, number]>([25.1, 49.5])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const [tileError, setTileError] = useState(false)
  const [tileRetryKey, setTileRetryKey] = useState(0)

  const searchPlace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const place = query.trim()
    if (!place) {
      setMessage(isArabic ? 'أدخل اسم مدينة أو موقع.' : 'Enter a city or location.')
      return
    }

    setSearching(true)
    setMessage('')
    try {
      const endpoint = import.meta.env.VITE_GEOCODING_ENDPOINT || 'https://nominatim.openstreetmap.org/search'
      const url = new URL(endpoint)
      url.searchParams.set('format', 'jsonv2')
      url.searchParams.set('limit', '1')
      url.searchParams.set('q', place)
      const response = await fetch(url)
      if (!response.ok) throw new Error('Location search is temporarily unavailable.')
      const results = (await response.json()) as SearchResult[]
      const result = results[0]
      if (!result) {
        setMessage(isArabic ? 'لم نعثر على هذا المكان. جرّب اسم مدينة أو دولة.' : 'We could not find that place. Try a city or country name.')
        return
      }
      setCenter([Number(result.lat), Number(result.lon)])
      setMessage(result.display_name.split(',').slice(0, 3).join(','))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isArabic ? 'تعذّر البحث عن الموقع.' : 'Location search failed.'))
    } finally {
      setSearching(false)
    }
  }

  return (
    <section className="map-panel" aria-label="Explore jobs on the map">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">{isArabic ? 'استكشف حسب الموقع' : 'Explore by location'}</span>
          <h2>{isArabic ? 'الفرص على الخريطة' : 'Opportunities, on the map'}</h2>
        </div>
        <form className="map-search" onSubmit={searchPlace}>
          <label className="sr-only" htmlFor="map-place-search">{isArabic ? 'ابحث عن مدينة أو موقع' : 'Search a city or location'}</label>
          <input
            id="map-place-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isArabic ? 'ابحث عن دبي أو الرياض أو تورونتو...' : 'Search Dubai, Riyadh, Toronto...'}
          />
          <button className="button button-gold" disabled={searching} type="submit">
            {searching ? (isArabic ? 'جارٍ البحث' : 'Searching') : (isArabic ? 'ابحث عن الموقع' : 'Find place')}
          </button>
        </form>
      </div>
      <div className="map-message" role="status">{message}</div>
      {tileError && <p className="map-tile-error" role="alert">{isArabic ? 'تعذّر تحميل بعض أجزاء الخريطة.' : 'Some map tiles could not be loaded.'} <button type="button" onClick={() => { setTileError(false); setTileRetryKey((key) => key + 1) }}>{isArabic ? 'إعادة المحاولة' : 'Retry'}</button></p>}
      <div className="map-canvas">
        <MapContainer center={center} zoom={4} scrollWheelZoom className="job-map">
          <TileLayer
            key={tileRetryKey}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          <MapFocus center={center} />
          {jobs.map((job) => (
            <Marker key={job.id} position={job.coordinates} icon={markerIcon}>
              <Popup>
                <div className="map-popup">
                  <span>{job.city}, {job.country}</span>
                  <strong>{job.title}</strong>
                  <small>{job.company} · {formatMoney(job.salaryMin, job.currency)}–{formatMoney(job.salaryMax, job.currency)}</small>
                  <button type="button" onClick={() => onSelectJob(job)}>{isArabic ? 'عرض الوظيفة' : 'View opportunity'}</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <p className="map-attribution-note">{isArabic ? 'بيانات الخريطة © مساهمو OpenStreetMap.' : 'Map data © OpenStreetMap contributors.'}</p>
    </section>
  )
}
