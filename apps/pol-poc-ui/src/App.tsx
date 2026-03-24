import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { ThemeProvider } from './lib/theme';
import { GraphView } from './views/GraphView';
import { SpecificationView } from './views/SpecificationView';
import { BusinessView } from './views/BusinessView';

type View = 'specification' | 'graph' | 'business';

export function App() {
  const [view, setView] = useState<View>('graph');

  return (
    <ThemeProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar view={view} onViewChange={setView} />
        {view === 'graph' && <GraphView />}
        {view === 'specification' && <SpecificationView />}
        {view === 'business' && <BusinessView />}
      </div>
    </ThemeProvider>
  );
}
