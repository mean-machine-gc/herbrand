import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 border-b border-border px-4',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { accent?: string }
>(({ className, accent, ...props }, ref) => {
  const [active, setActive] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      setActive(el.getAttribute('data-state') === 'active');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-state'] });
    setActive(el.getAttribute('data-state') === 'active');
    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.Trigger
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        'inline-flex items-center justify-center px-4 py-3 text-sm font-medium cursor-pointer transition-colors',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      style={{
        borderBottom: active ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
        marginBottom: -1,
      }}
      {...props}
    />
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
