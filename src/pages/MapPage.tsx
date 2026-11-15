import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import classes from './MapPage.module.css';
import { useEffect, useState } from 'react';
import { Button, Container, Group, Text } from '@mantine/core';

type Point = {
  row: number;
  col: number;
};

type Pin = {
  point: Point;
  position: [number, number];
};

type RasterMeta = {
  width: number;
  height: number;
};

type RoutePoint = {
  row: number;
  col: number;
};

type RouteResponse = {
  path?: RoutePoint[];
  straightLine?: { path?: RoutePoint[] };
  metrics?: { doseMSv?: number } | null;
};

const TILE_SIZE = 256;

function MapClickHandler({
  raster,
  onPlacePin,
}: {
  raster: RasterMeta;
  onPlacePin: (point: Point, position: [number, number]) => void;
}) {
  const map = useMap();

  useMapEvents({
    click: (event: LeafletMouseEvent) => {
      const worldPoint = map.project(event.latlng, 0);
      const col = Math.min(
        raster.width - 1,
        Math.max(0, Math.floor((worldPoint.x / TILE_SIZE) * raster.width)),
      );
      const row = Math.min(
        raster.height - 1,
        Math.max(0, Math.floor((worldPoint.y / TILE_SIZE) * raster.height)),
      );
      onPlacePin({ row, col }, [event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

function RoutePathOverlay({ path, raster }: { path: RoutePoint[]; raster: RasterMeta }) {
  const map = useMap();

  return (
    <>
      {path.map((point, index) => {
        const position = map.unproject(
          [
            (point.col / raster.width) * TILE_SIZE,
            (point.row / raster.height) * TILE_SIZE,
          ],
          0,
        );

        return (
          <CircleMarker
            key={`${point.row}-${point.col}-${index}`}
            center={[position.lat, position.lng]}
            radius={4}
            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.8 }}
          />
        );
      })}
    </>
  );
}

function StraightLineOverlay({ path, raster }: { path: RoutePoint[]; raster: RasterMeta }) {
  const map = useMap();
  const positions = path.map((point) => {
    const position = map.unproject(
      [
        (point.col / raster.width) * TILE_SIZE,
        (point.row / raster.height) * TILE_SIZE,
      ],
      0,
    );
    return [position.lat, position.lng] as [number, number];
  });

  return positions.length > 1 ? (
    <Polyline positions={positions} pathOptions={{ color: 'green', weight: 4 }} />
  ) : null;
}

export function MapPage() {
  const [whichMap, setWhichMap] = useState(false);
  const [raster, setRaster] = useState<RasterMeta | null>(null);
  const [pinA, setPinA] = useState<Pin | null>(null);
  const [pinB, setPinB] = useState<Pin | null>(null);
  const [routePath, setRoutePath] = useState<RoutePoint[]>([]);
  const [straightLinePath, setStraightLinePath] = useState<RoutePoint[]>([]);
  const [radiationDoseMicroSv, setRadiationDoseMicroSv] = useState<number | null>(null);
  const [pinAIsLeastRecentlyUsed, setPinAIsLeastRecentlyUsed] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/meta')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Terrain metadata request failed with status ${response.status}.`);
        }

        const metadata = (await response.json()) as Partial<RasterMeta>;
        if (
          typeof metadata.width !== 'number' ||
          !Number.isInteger(metadata.width) ||
          metadata.width <= 0 ||
          typeof metadata.height !== 'number' ||
          !Number.isInteger(metadata.height) ||
          metadata.height <= 0
        ) {
          throw new Error('Terrain metadata returned invalid raster dimensions.');
        }

        setRaster({ width: metadata.width, height: metadata.height });
      })
      .catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : 'Unable to load terrain metadata.');
      });
  }, []);

  const placePin = (point: Point, position: [number, number]) => {
    const pin = {
      point,
      position,
    };

    if (pinAIsLeastRecentlyUsed) {
      setPinA(pin);
    } else {
      setPinB(pin);
    }
    setPinAIsLeastRecentlyUsed(!pinAIsLeastRecentlyUsed);
    setRoutePath([]);
    setStraightLinePath([]);
    setRadiationDoseMicroSv(null);
    setStatus(null);
  };

  const clearPins = () => {
    setPinA(null);
    setPinB(null);
    setPinAIsLeastRecentlyUsed(true);
    setRoutePath([]);
    setStraightLinePath([]);
    setStatus(null);
  };

  const calculatePath = async () => {
    if (!pinA || !pinB) {
      setStatus('Place both pins before calculating a path.');
      return;
    }

    try {
      const response = await fetch( `http://localhost:3001/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: pinA.point, end: pinB.point }),
      });

      if (!response.ok) {
        let message = `Route request failed with status ${response.status}.`;

        try {
          const error = (await response.json()) as { message?: unknown };
          if (typeof error.message === 'string' && error.message.length > 0) {
            message = error.message;
          }
        } catch {
          // Keep the HTTP status when the server does not return JSON.
        }

        throw new Error(message);
      }

      const result = (await response.json()) as RouteResponse;
      if (
        !Array.isArray(result.path) ||
        result.path.some(
          (point) =>
            !Number.isInteger(point.row) ||
            !Number.isInteger(point.col),
        )
      ) {
        throw new Error('Route response did not contain a valid path.');
      }
      if (
        !Array.isArray(result.straightLine?.path) ||
        result.straightLine.path.some(
          (point) =>
            !Number.isInteger(point.row) ||
            !Number.isInteger(point.col),
        )
      ) {
        throw new Error('Route response did not contain a valid straight-line path.');
      }
      if (typeof result.metrics?.doseMSv !== 'number' || !Number.isFinite(result.metrics.doseMSv)) {
        throw new Error('Route response did not contain a valid radiation dose.');
      }

      setRoutePath(result.path);
      setStraightLinePath(result.straightLine.path);
      setRadiationDoseMicroSv(result.metrics.doseMSv * 1000);
      setStatus('Path calculated successfully.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to calculate path.');
    }
  };

  return  (
    <main className={classes.page}>
      <aside className={classes.radiationBar}>
        <Text size="sm" fw={700}>Radiation</Text>
        <Text size="xl">
          {radiationDoseMicroSv === null
            ? 'No route calculated'
            : `${radiationDoseMicroSv.toFixed(2)} µSv`}
        </Text>
      </aside>
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
          {raster && <MapClickHandler raster={raster} onPlacePin={placePin} />}
          {raster && <RoutePathOverlay path={routePath} raster={raster} />}
          {raster && <StraightLineOverlay path={straightLinePath} raster={raster} />}
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
