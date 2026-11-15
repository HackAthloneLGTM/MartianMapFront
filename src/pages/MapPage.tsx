import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import classes from './MapPage.module.css';
import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Divider, Grid, Group, Paper, SimpleGrid, Stack, Text, Title, useComputedColorScheme } from '@mantine/core';
import "./moveme.css"

type RasterPoint = {
  row: number;
  col: number;
};

type Pin = {
  point: RasterPoint;
  position: [number, number];
};

type RouteMetrics = {
  distance2d: number;
  ascent: number;
  descent: number;
  maxSlope: number;
  meanSlope: number;
  oneWayMinutes: number;
  totalEvaMinutes: number;
  doseMSv: number;
};

type RouteWarning = {
  code: 'STEEP_SECTION' | 'IMPASSABLE_SECTION' | 'NO_ROUTE' | 'STRAIGHT_LINE_BLOCKED' | 'EXCEEDS_EVA_LIMIT';
  message: string;
};

type SlopeClass = {
  maxDeg: number;
  multiplier: number | null;
};

type RouteResult = {
  found: boolean;
  path: RasterPoint[];
  metrics: RouteMetrics;
  warnings: RouteWarning[];
  options: {
    slopeClasses: SlopeClass[];
  };
};

type Meta = {
  width: number;
  height: number;
  defaults: {
    doseRateMSvPerDay: number;
    walkingSpeedKmh: number;
  };
};

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max - 1);

const toRasterPoint = ([latitude, longitude]: [number, number], meta: Meta): RasterPoint => {
  const fractionX = (longitude + 180) / 360;
  const fractionY = (1 - Math.asinh(Math.tan((latitude * Math.PI) / 180)) / Math.PI) / 2;
  return {
    row: clamp(Math.floor(fractionY * meta.height), meta.height),
    col: clamp(Math.floor(fractionX * meta.width), meta.width),
  };
};

const toLatLng = ({ row, col }: RasterPoint, meta: Meta): [number, number] => {
  const fractionX = (col + 0.5) / meta.width;
  const fractionY = (row + 0.5) / meta.height;
  return [(Math.atan(Math.sinh(Math.PI * (1 - 2 * fractionY))) * 180) / Math.PI, fractionX * 360 - 180];
};

const isImpassable = (result: RouteResult) =>
  !result.found || result.warnings.some((warning) => warning.code === 'IMPASSABLE_SECTION' || warning.code === 'NO_ROUTE');

const steepRange = (slopeClasses: SlopeClass[]) => {
  const index = slopeClasses.findIndex((slopeClass) => slopeClass.multiplier !== null && slopeClass.multiplier >= 2);
  if (index === -1) {
    return '';
  }
  const lower = index > 0 ? slopeClasses[index - 1].maxDeg : 0;
  return ` (${lower}-${slopeClasses[index].maxDeg} degrees)`;
};

const warningLabels = (result: RouteResult) => {
  const labels = result.warnings
    .filter((warning) => warning.code !== 'STRAIGHT_LINE_BLOCKED')
    .map((warning) => {
      if (warning.code === 'STEEP_SECTION') {
        return `Steep section${steepRange(result.options.slopeClasses)}`;
      }
      if (warning.code === 'EXCEEDS_EVA_LIMIT') {
        return 'Exceeds EVA limit';
      }
      return warning.message;
    });
  return [...new Set(labels)];
};

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return hours > 0 ? `${hours} h ${rest} min` : `${rest} min`;
};

const formatDistance = (metres: number) =>
  metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={classes.stat}>
      <Text className={classes.statLabel}>{label}</Text>
      <Text className={classes.statValue}>{value}</Text>
    </div>
  );
}

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
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    fetch('/api/meta')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Meta request failed with status ${response.status}.`))))
      .then(setMeta)
      .catch((error: Error) => setStatus(error.message));
    fetch('/api/route/default')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`Route request failed with status ${response.status}.`))))
      .then((result: RouteResult) => {
        if (isImpassable(result)) {
          setStatus('Default route is impassable.');
          return;
        }
        setRoute(result);
      })
      .catch((error: Error) => setStatus(error.message));
  }, []);

  const placePin = ([latitude, longitude]: [number, number]) => {
    if (!meta) {
      setStatus('Terrain bounds not loaded yet.');
      return;
    }

    const pin = {
      point: toRasterPoint([latitude, longitude], meta),
      position: [latitude, longitude] as [number, number],
    };

    const nextPinA = pinAIsLeastRecentlyUsed ? pin : pinA;
    const nextPinB = pinAIsLeastRecentlyUsed ? pinB : pin;
    setPinA(nextPinA);
    setPinB(nextPinB);
    setPinAIsLeastRecentlyUsed(!pinAIsLeastRecentlyUsed);
    setStatus(null);
    if (nextPinA && nextPinB) {
      void calculatePath(nextPinA, nextPinB);
    }
  };

  const clearPins = () => {
    setPinA(null);
    setPinB(null);
    setPinAIsLeastRecentlyUsed(true);
    requestId.current += 1;
    setRoute(null);
    setStatus(null);
  };

  const calculatePath = async (start: Pin, end: Pin) => {
    const currentRequest = ++requestId.current;
    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: start.point, end: end.point }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? `Route request failed with status ${response.status}.`);
      }

      const result: RouteResult = await response.json();
      if (currentRequest !== requestId.current) {
        return;
      }
      if (isImpassable(result)) {
        setRoute(null);
        setStatus('Route is impassable. Try different pins.');
        return;
      }
      setRoute(result);
      setStatus(null);
    } catch (error) {
      if (currentRequest !== requestId.current) {
        return;
      }
      setStatus(error instanceof Error ? error.message : 'Unable to calculate path.');
    }
  };

  const metrics = route?.found ? route.metrics : null;
  const colorScheme = useComputedColorScheme('dark');
  const routeLine = route?.found && meta ? route.path.map((point) => toLatLng(point, meta)) : null;

  return (
    <>
      <main className={classes.page}>
        <Box className={classes.titleBlock}>
          <Text className={classes.eyebrow}>Mars EVA route planning · Jezero Crater</Text>
          <Title order={1} className={classes.title}>Jezero Planner</Title>
        </Box>
        <Grid gap="xl">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              <Paper withBorder p="lg" className={classes.panel}>
                <Title order={2} className={classes.panelTitle}>Route</Title>
                <Divider my="md" />
                <SimpleGrid cols={2} spacing="lg" verticalSpacing="lg">
                  <Stat label="Time remaining" value={metrics ? formatMinutes(metrics.totalEvaMinutes) : '—'} />
                  <Stat label="One way" value={metrics ? formatMinutes(metrics.oneWayMinutes) : '—'} />
                  <Stat label="Length" value={metrics ? formatDistance(metrics.distance2d) : '—'} />
                  <Stat label="Ascent" value={metrics ? `${metrics.ascent.toFixed(1)} m` : '—'} />
                  <Stat label="Descent" value={metrics ? `${metrics.descent.toFixed(1)} m` : '—'} />
                  <Stat label="Radiation dose" value={metrics ? `${metrics.doseMSv.toFixed(3)} mSv` : '—'} />
                </SimpleGrid>
              </Paper>

              <Paper withBorder p="lg" className={classes.panel}>
                <Title order={2} className={classes.panelTitle}>Conditions</Title>
                <Divider my="md" />
                <SimpleGrid cols={2} spacing="lg" verticalSpacing="lg">
                  <Stat label="Radiation rate" value={meta ? `${Number(meta.defaults.doseRateMSvPerDay.toPrecision(6))} mSv/day` : '—'} />
                  <Stat label="Max slope" value={metrics ? `${metrics.maxSlope.toFixed(1)}°` : '—'} />
                  <Stat label="Mean slope" value={metrics ? `${metrics.meanSlope.toFixed(1)}°` : '—'} />
                  <div className={`${classes.stat} ${classes.fullWidth}`}>
                    <Text className={classes.statLabel}>Warnings</Text>
                    {route && warningLabels(route).length > 0
                      ? warningLabels(route).map((label) => (
                          <Text key={label} className={classes.statValue}>{label}</Text>
                        ))
                      : <Text className={classes.statValue}>{route ? 'n/a' : '—'}</Text>}
                  </div>
                </SimpleGrid>
              </Paper>

            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Group justify="space-between" mb="xs">
              <Text className={classes.statLabel}>{whichMap ? 'Elevation' : 'Slope'}</Text>
              <Text className={classes.statLabel}>{pinA && pinB ? 'A → B placed' : pinA ? 'Place pin B' : 'Place pin A'}</Text>
            </Group>
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
                {routeLine && <Polyline positions={routeLine} pathOptions={{ color: colorScheme === 'dark' ? '#ffffff' : '#000000', weight: 3 }} />}
              </MapContainer>
            </div>
            <Container className={classes.buttonContainer}>
              <Group>
                <Button onClick={clearPins} variant="default" className={classes.button}>Clear pins</Button>
                <Button onClick={() => setWhichMap(!whichMap)} variant="default" className={classes.button}>
                  {whichMap ? 'Show Slope Map' : 'Show Elevation Map'}
                </Button>
              </Group>
              {status && <Text size="sm" ff="monospace" c="dimmed">{status}</Text>}
            </Container>
          </Grid.Col>
        </Grid>
      </main>

      <Box component="footer" className={classes.footer}>
        <Group justify="space-between" align="flex-end">
          <div>
            <Text className={classes.footerTitle}>Jezero Planner</Text>
            <Text size="sm" c="dimmed">Slope-aware A* routing for astronaut EVAs.</Text>
          </div>
          <Stack gap={2} align="flex-end">
            <Text className={classes.statLabel}>HiRISE DTEEC_023524_1985</Text>
            <Text className={classes.statLabel}>Jezero Crater, Mars</Text>
          </Stack>
        </Group>
      </Box>
    </>
  );
}
