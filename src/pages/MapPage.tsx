import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import classes from './MapPage.module.css';
import { useState } from 'react';
import { Container } from '@mantine/core';

export function MapPage() {

  let [whichMap, setWhichMap] = useState(false);

  return  (
    <main className={classes.page}>
      <MapContainer
        className={classes.map}
        center={[20, 0]}
        maxBounds={[
          [-90, -180],
          [90, 180],
        ]}
        maxBoundsViscosity={1}
        zoom={1}
        scrollWheelZoom
      >
        {whichMap ?
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          noWrap
          url="http://localhost:3001/map_elevation/{z}/{x}/{y}/png"
        /> : <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          noWrap
          url="http://localhost:3001/map_slope/{z}/{x}/{y}/png"
        />}
      </MapContainer>

      <Container className={classes.buttonContainer}>
        <button className={classes.button} onClick={() => setWhichMap(!whichMap)}>
          {whichMap ? 'Show Slope Map' : 'Show Elevation Map'}
        </button>
      </Container>

      </main>
    );
}
