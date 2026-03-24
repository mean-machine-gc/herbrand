import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';

type View = 'specification' | 'graph' | 'business' | 'document';

export function Navbar({ view, onViewChange }: { view: View; onViewChange: (v: View) => void }) {
  const { theme, toggle } = useTheme();

  return (
    <nav className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tracking-tight">
          <span className="text-muted-foreground">herbrand</span>
          <span className="text-foreground/40 mx-1">/</span>
          <span className="text-foreground">policies</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <NavLink active={view === 'specification'} onClick={() => onViewChange('specification')}>
          Specification
        </NavLink>
        <NavLink active={view === 'graph'} onClick={() => onViewChange('graph')}>
          Graph
        </NavLink>
        <NavLink active={view === 'business'} onClick={() => onViewChange('business')}>
          Business
        </NavLink>
        <NavLink active={view === 'document'} onClick={() => onViewChange('document')}>
          Document
        </NavLink>

        <div className="w-px h-4 bg-border mx-2" />

        <button
          onClick={toggle}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 text-muted-foreground" />
            : <Moon className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </div>
    </nav>
  );
}

function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      {children}
    </button>
  );
}
