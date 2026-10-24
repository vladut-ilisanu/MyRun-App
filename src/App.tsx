import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Home, CalendarDays, Gauge, BookOpen, Settings } from 'lucide-react';
import { TodayTab } from './tabs/TodayTab';
import { CalendarTab } from './tabs/CalendarTab';
import { ZonesTab } from './tabs/ZonesTab';
import { KnowledgeTab } from './tabs/KnowledgeTab';
import { SetupTab } from './tabs/SetupTab';
import { Onboarding } from './components/Onboarding';
import { useStore } from './state/store';

const tabs = [
  { to: '/today', label: 'Today', icon: Home },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/stats', label: 'Stats', icon: Gauge },
  { to: '/guide', label: 'Guide', icon: BookOpen },
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
        <Route path="/calendar" element={<CalendarTab />} />
        <Route path="/plan" element={<Navigate to="/calendar" replace />} />
        <Route path="/stats" element={<ZonesTab />} />
        <Route path="/zones" element={<Navigate to="/stats" replace />} />
        <Route path="/guide" element={<KnowledgeTab />} />
        <Route path="/setup" element={<SetupTab />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>

      <nav className="tabbar flex justify-around px-2 pt-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="press flex-1">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-1 py-1">
                <div
                  className="flex h-9 w-12 items-center justify-center rounded-full transition-colors"
                  style={{ backgroundColor: isActive ? 'rgba(123,140,255,0.16)' : 'transparent' }}
                >
                  <Icon size={20} color={isActive ? '#7B8CFF' : '#7A7A86'} strokeWidth={2.4} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? '#7B8CFF' : '#7A7A86' }}>
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
