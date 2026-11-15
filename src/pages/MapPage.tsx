import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import classes from './MapPage.module.css';
import { useState } from 'react';
import { Button, Container, Group, Text } from '@mantine/core';

type Point = {
  x: number;
  y: number;
};

type Pin = {
  point: Point;
  position: [number, number];
};

function MapClickHandler({ onPlacePin }: { onPlacePin: (position: [number, number]) => void }) {
  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      onPlacePin([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

export function MapPage() {
  const [whichMap, setWhichMap] = useState(false);
  const [pinA, setPinA] = useState<Pin | null>(null);
  const [pinB, setPinB] = useState<Pin | null>(null);
  const [pinAIsLeastRecentlyUsed, setPinAIsLeastRecentlyUsed] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const placePin = ([latitude, longitude]: [number, number]) => {
    const pin = {
      point: { x: longitude, y: latitude },
      position: [latitude, longitude] as [number, number],
    };

    if (pinAIsLeastRecentlyUsed) {
      setPinA(pin);
    } else {
      setPinB(pin);
    }
    setPinAIsLeastRecentlyUsed(!pinAIsLeastRecentlyUsed);
    setStatus(null);
  };

  const clearPins = () => {
    setPinA(null);
    setPinB(null);
    setPinAIsLeastRecentlyUsed(true);
    setStatus(null);
  };

  const calculatePath = async () => {
    if (!pinA || !pinB) {
      setStatus('Place both pins before calculating a path.');
      return;
    }

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: pinA.point, end: pinB.point }),
      });

      if (!response.ok) {
        throw new Error(`Route request failed with status ${response.status}.`);
      }

      setStatus('Path calculated successfully.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to calculate path.');
    }
  };

  return  (
    <main className={classes.page}>
      <div className={classes.mapWrapper}>
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
          <MapClickHandler onPlacePin={placePin} />
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
          {pinA && <Marker position={pinA.position} />}
          {pinB && <Marker position={pinB.position} />}
        </MapContainer>

        <Container className={classes.buttonContainer}>
          <Group>
            <Button onClick={clearPins} variant="light">Clear pins</Button>
            <Button onClick={calculatePath} disabled={!pinA || !pinB}>Calculate path</Button>
            <Button onClick={() => setWhichMap(!whichMap)} variant="default">
              {whichMap ? 'Show Slope Map' : 'Show Elevation Map'}
            </Button>
          </Group>
          {status && <Text size="sm">{status}</Text>}
        </Container>
      </div>
    </main>
  );
}
