<script setup lang="ts">
import { onMounted, ref } from 'vue'
import L from 'leaflet'
// LeafletのCSSを読み込まないと地図が崩れます
import 'leaflet/dist/leaflet.css'
import { FetchIOFunctionsImpl } from './core/FetchIOFunctionsImpl'
import type { IOFunctions } from './core/IOFunctions'
import { RTreeSystemImpl } from './core/RTreeSystemImpl'
import { GeoPoint } from './core/GeoPoint'
const io:IOFunctions = new FetchIOFunctionsImpl(
  './assets/out.rtbf',BigInt(5157440),BigInt(5157440),0x1000,1024);
//↓の１行を有効にすると地図が出なくなってしまう。なぜ？
//
const mapContainer = ref<HTMLElement | null>(null)
let system:RTreeSystemImpl|null = null;
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
map.on("click", e => {
      const gp = new GeoPoint(e.latlng.lng,e.latlng.lat);
      let members = "";
      system?.nearest(gp,5).then((nr)=>{
        members=JSON.stringify(nr.members);
        alert(members);
      })
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
  <!-- 地図の上に重ねてファイル選択ボタンを配置 -->
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scoped>
.ui-layer {
  position: absolute;
  top: 10px;
  left: 50px;
  z-index: 1000; /* Leafletの地図より手前に表示 */
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.map-container {
  width: 100%;
  height: 100%;
}
</style>