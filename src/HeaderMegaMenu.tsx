import { IconHeartbeat, IconMapPin } from '@tabler/icons-react';
import { Box, Group } from '@mantine/core';
import { NavLink } from 'react-router-dom';
import classes from './HeaderMegaMenu.module.css';

const links = [
  { icon: IconMapPin, label: 'Map', to: '/map' },
  { icon: IconHeartbeat, label: 'Monitor', to: '/monitor' },
];

export function HeaderMegaMenu() {
  return (
    <Box pb={120}>
      <header className={classes.header}>
        <Group h="100%" gap={0}>
          {links.map(({ icon: Icon, label, to }) => (
            <NavLink
              to={to}
              className={({ isActive }) =>
                isActive ? `${classes.link} ${classes.active}` : classes.link
              }
              key={label}
            >
              <Icon size={20} stroke={1.5} />
              <span>{label}</span>
            </NavLink>
          ))}
        </Group>
      </header>
    </Box>
  );
}
