import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { MapPage } from './pages/MapPage';
import { MonitorPage } from './pages/MonitorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/map" element={<MapPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
