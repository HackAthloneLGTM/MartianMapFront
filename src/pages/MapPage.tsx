import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import classes from './MapPage.module.css';

export function MapPage() {
  return  (
    <main className={classes.page}>
      <MapContainer
        className={classes.map}
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </main>);
}
