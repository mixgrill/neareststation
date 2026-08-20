<script setup lang="ts">
import { onMounted, ref } from 'vue'
import L from 'leaflet'
// LeafletのCSSを読み込まないと地図が崩れます
import 'leaflet/dist/leaflet.css'
import { FetchIOFunctionsImpl } from './core/FetchIOFunctionsImpl'
import type { IOFunctions } from './core/IOFunctions'
import { RTreeSystemImpl } from './core/RTreeSystemImpl'
import { GeoPoint } from './core/GeoPoint'

interface SearchResult {
  stationName: string
  lineName: string
  distance: number
  directionsUrl: string
}

interface RankedMember {
  member: {
    properties?: Record<string, unknown>
    geoPoint?: GeoPoint
  }
  score: number
}

const io:IOFunctions = new FetchIOFunctionsImpl(
  './assets/out.rtbf',BigInt(5157440),BigInt(5157440),0x1000,1024);
//↓の１行を有効にすると地図が出なくなってしまう。なぜ？
//
const mapContainer = ref<HTMLElement | null>(null)
const results = ref<SearchResult[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)
let system:RTreeSystemImpl|null = null;
let searchVersion = 0
let nearestStationMarkers: L.LayerGroup | null = null
let clickedLocationIndicator: L.LayerGroup | null = null

function asText(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : '—'
}

function formatDistance(distance: number): string {
  return distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance)} m`
}

function directionsUrl(origin: GeoPoint, stationName: string, lineName: string): string {
  const station = stationName.endsWith('駅') ? stationName : `${stationName}駅`
  const destination = lineName === '—' ? station : `${station} ${lineName}`
  const parameters = new URLSearchParams({
    api: '1',
    origin: `${origin.latitude},${origin.longitude}`,
    destination,
    travelmode: 'walking',
  })
  return `https://www.google.com/maps/dir/?${parameters}`
}

function toSearchResult({ member, score }: RankedMember, origin: GeoPoint): SearchResult {
  const properties = member.properties ?? {}
  const stationName = asText(properties.N02_005)
  const lineName = asText(properties.N02_003)
  return {
    stationName,
    lineName,
    distance: -score,
    directionsUrl: directionsUrl(origin, stationName, lineName),
  }
}

function directionsPopup(result: SearchResult): HTMLElement {
  const container = document.createElement('div')
  const station = document.createElement('strong')
  const line = document.createElement('div')
  const link = document.createElement('a')

  station.textContent = result.stationName
  line.textContent = result.lineName
  link.href = result.directionsUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  link.textContent = 'Google Maps で徒歩案内'

  container.append(station, line, link)
  return container
}

function closeResults(): void {
  searchVersion += 1
  hasSearched.value = false
  isSearching.value = false
  results.value = []
}

onMounted(async () => {
  if (!mapContainer.value) return

  // 地図の初期化（デフォルトは皇居）
const map = L.map(mapContainer.value).setView([35.6852, 139.7528], 14)

// 現在地を取得できたら現在地へ移動
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      map.setView([lat, lng], 14)
    },
    (error) => {
      console.log('位置情報を取得できませんでした', error)
    }
  )
}
map.on("click", async e => {
      const gp = new GeoPoint(e.latlng.lng,e.latlng.lat);
      if (!system) return

      if (nearestStationMarkers) {
        map.removeLayer(nearestStationMarkers)
        nearestStationMarkers = null
      }
      if (clickedLocationIndicator) {
        map.removeLayer(clickedLocationIndicator)
        clickedLocationIndicator = null
      }

      clickedLocationIndicator = L.layerGroup([
        L.circleMarker(e.latlng, {
          radius: 18,
          color: '#2563eb',
          weight: 2,
          fillColor: '#60a5fa',
          fillOpacity: .16,
          interactive: false,
        }),
        L.circleMarker(e.latlng, {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 1,
          interactive: false,
        }),
      ]).addTo(map)

      const currentSearchVersion = ++searchVersion
      isSearching.value = true
      hasSearched.value = true
      results.value = []
      try {
        const nr = await system.nearest(gp, 5)
        if (currentSearchVersion === searchVersion) {
          results.value = nr.members.map((member) => toSearchResult(member, gp))
          const stations = nr.members.flatMap((rankedMember, index) => {
            const geoPoint = rankedMember.member.geoPoint
            if (!geoPoint) return []

            return [{
              latLng: L.latLng(geoPoint.latitude, geoPoint.longitude),
              result: results.value[index],
            }]
          })
          const stationLatLngs = stations.map(({ latLng }) => latLng)

          if (stationLatLngs.length > 0) {
            nearestStationMarkers = L.layerGroup(
              stations.map(({ latLng, result }) => L.marker(latLng)
                .bindTooltip(
                  `${result.stationName} / ${result.lineName}（${formatDistance(result.distance)}）`,
                  { direction: 'top', offset: [0, -28] },
                )
                .bindPopup(directionsPopup(result), { offset: [0, -20] }),
              ),
            ).addTo(map)

            if (stationLatLngs.some((stationLatLng) => !map.getBounds().contains(stationLatLng))) {
              map.fitBounds(L.latLngBounds([e.latlng, ...stationLatLngs]), {
                padding: [48, 48],
                maxZoom: map.getZoom(),
              })
            }
          }
        }
      } catch (error) {
        console.error('最寄り駅の検索に失敗しました', error)
      } finally {
        if (currentSearchVersion === searchVersion) isSearching.value = false
      }
      // const rootMbrs=[{"minX":129.85716,"minY":31.57652,"maxX":140.61698107,"maxY":37.90716391},{"minX":130.32028,"minY":33.5454,"maxX":141.10002,"maxY":42.31575},{"minX":135.46625,"minY":33.66239,"maxX":142.39214,"maxY":43.3486},{"minX":127.65228,"minY":26.19319,"maxX":139.84211,"maxY":37.22872},{"minX":133.3219,"minY":34.66692,"maxX":145.58413,"maxY":45.41688}];
      // for (const mbr of rootMbrs) {
      //   L.rectangle(
      //     [
      //       [mbr.minY, mbr.minX],
      //       [mbr.maxY, mbr.maxX],
      //     ],
      //     {
      //       color: 'red',
      //       weight: 2,
      //       fill: false,
      //     }
      //   ).addTo(map)
      // }
      // rootMbrs.forEach((mbr, i) => {
      //   const centerLat = (mbr.minY + mbr.maxY) / 2
      //   const centerLon = (mbr.minX + mbr.maxX) / 2

      //   L.marker([centerLat, centerLon])
      //     .bindTooltip(`root ${i}`)
      //     .addTo(map)
      // })
      // const clicked = alert(
      //     e.latlng.lng+" "+e.latlng.lat+" "
      // )
  });
  // 国土地理院の標準地図タイルレイヤーを追加
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">国土地理院</a>',
    maxZoom: 18,
  }).addTo(map)
  system = await RTreeSystemImpl.create(io);
});

</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
  <p class="app-title">近所の駅アプリ</p>
  <div v-if="hasSearched" class="modal-backdrop" @click.self="closeResults">
    <aside class="result-window" role="dialog" aria-modal="true" aria-labelledby="result-window-title" aria-live="polite">
      <header class="result-window__header">
        <div>
          <h1 id="result-window-title">最寄り駅</h1>
          <p>クリックした地点に近い駅を表示</p>
        </div>
        <button class="close-button" type="button" aria-label="検索結果を閉じる" @click="closeResults">×</button>
      </header>

      <p v-if="isSearching" class="message">R-Tree を検索しています…</p>
      <p v-else-if="results.length === 0" class="message">検索結果はありませんでした。</p>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr><th>駅名</th><th>路線名</th><th class="distance">距離</th><th>案内</th></tr>
          </thead>
          <tbody>
            <tr v-for="result in results" :key="`${result.stationName}-${result.lineName}-${result.distance}`">
              <td>{{ result.stationName }}</td>
              <td>{{ result.lineName }}</td>
              <td class="distance">{{ formatDistance(result.distance) }}</td>
              <td><a class="directions-link" :href="result.directionsUrl" target="_blank" rel="noopener noreferrer">徒歩案内</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
.app-title {
  position: fixed;
  z-index: 750;
  right: 8px;
  bottom: 28px;
  margin: 0;
  color: #475569;
  font-size: 12px;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, .9);
}
.modal-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, .32);
}
.result-window {
  width: min(560px, 100%);
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: rgba(255, 255, 255, .96);
  box-shadow: 0 12px 32px rgba(15, 23, 42, .2);
  color: #172033;
}
.result-window__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px 18px 14px; border-bottom: 1px solid #e2e8f0; }
h1, p { margin: 0; }
h1 { font-size: 18px; }
.result-window__header p { margin-top: 3px; color: #64748b; font-size: 13px; }
.close-button { width: 30px; height: 30px; border: 0; border-radius: 6px; background: transparent; color: #475569; cursor: pointer; font-size: 24px; line-height: 1; }
.close-button:hover { background: #f1f5f9; }
.message { padding: 20px 18px; color: #475569; font-size: 14px; }
.table-wrapper { max-height: min(360px, calc(100vh - 160px)); overflow: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 11px 18px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { position: sticky; top: 0; background: #f8fafc; color: #475569; font-size: 12px; }
tbody tr:last-child td { border-bottom: 0; }
.distance { text-align: right; white-space: nowrap; }
.directions-link { color: #0369a1; font-weight: 600; text-decoration: none; white-space: nowrap; }
.directions-link:hover { text-decoration: underline; }
</style>
