interface Props {
  children: React.ReactNode;
}

export function SectionLabel({ children }: Props) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-[3px] text-muted uppercase mb-3">
      {children}
      <span className="flex-1 h-px bg-border" />
    </div>
  );
}
