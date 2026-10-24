import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Home, CalendarRange, Gauge, Settings } from 'lucide-react';
import { TodayTab } from './tabs/TodayTab';
import { PlanTab } from './tabs/PlanTab';
import { ZonesTab } from './tabs/ZonesTab';
import { SetupTab } from './tabs/SetupTab';
import { Onboarding } from './components/Onboarding';
import { useStore } from './state/store';

const tabs = [
  { to: '/today', label: 'Today', icon: Home },
  { to: '/plan', label: 'Plan', icon: CalendarRange },
  { to: '/zones', label: 'Stats', icon: Gauge },
  { to: '/setup', label: 'Setup', icon: Settings },
];

export default function App() {
  const { onboarded, completeOnboarding } = useStore();

  if (!onboarded) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-md">
      <Routes>
        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayTab />} />
        <Route path="/plan" element={<PlanTab />} />
        <Route path="/zones" element={<ZonesTab />} />
        <Route path="/setup" element={<SetupTab />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>

      <nav className="tabbar flex justify-around px-3 pt-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="press flex-1">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1 py-1">
                <div
                  className="flex h-9 w-14 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,245,160,0.14)' : 'transparent',
                  }}
                >
                  <Icon size={21} color={isActive ? '#00F5A0' : '#7A7A86'} strokeWidth={2.4} />
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: isActive ? '#00F5A0' : '#7A7A86' }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
