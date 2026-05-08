interface Props {
  children: React.ReactNode;
}

export function Sidebar({ children }: Props) {
  return (
    <aside className="flex flex-col w-[300px] min-w-[300px] bg-panel border-l border-border overflow-y-auto">
      {children}
    </aside>
  );
}

export function SidebarSection({ children }: Props) {
  return (
    <div className="p-4 border-b border-border">
      {children}
    </div>
  );
}
