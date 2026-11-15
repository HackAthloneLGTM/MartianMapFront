import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css';

const theme = createTheme({
  primaryColor: 'gray',
  black: '#000000',
  white: '#ffffff',
  defaultRadius: 0,
  fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, Consolas, monospace",
  headings: {
    fontFamily: "'Inter', system-ui, 'Segoe UI', Roboto, sans-serif",
    fontWeight: '700',
  },
  colors: {
    gray: ['#f8f8f8', '#e8e8e8', '#d0d0d0', '#b0b0b0', '#909090', '#707070', '#505050', '#383838', '#202020', '#101010'],
    dark: ['#d8d8d8', '#b8b8b8', '#909090', '#686868', '#484848', '#303030', '#202020', '#161616', '#101010', '#080808'],
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>,
)
