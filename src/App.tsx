import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Activity, CalendarRange, Gauge, Settings } from 'lucide-react';
import { TodayTab } from './tabs/TodayTab';
import { PlanTab } from './tabs/PlanTab';
import { ZonesTab } from './tabs/ZonesTab';
import { SetupTab } from './tabs/SetupTab';

const tabs = [
  { to: '/today', label: 'Today', icon: Activity },
  { to: '/plan', label: 'Plan', icon: CalendarRange },
  { to: '/zones', label: 'Zones', icon: Gauge },
  { to: '/setup', label: 'Setup', icon: Settings },
];

export default function App() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-md">
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayTab />} />
        <Route path="/plan" element={<PlanTab />} />
        <Route path="/zones" element={<ZonesTab />} />
        <Route path="/setup" element={<SetupTab />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>

      <nav className="tabbar mx-auto flex max-w-md justify-around pt-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className="flex w-16 flex-col items-center gap-1 py-1 text-[11px]"
            style={({ isActive }) => ({ color: isActive ? '#00F5A0' : '#8A8A94' })}
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
