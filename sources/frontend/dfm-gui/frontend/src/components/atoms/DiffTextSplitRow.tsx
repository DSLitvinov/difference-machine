type DiffTextSplitRowProps = {
  line: number;
  text: string;
};

export function DiffTextSplitRow({ line, text }: DiffTextSplitRowProps) {
  return (
    <div className="flex w-full items-center text-[16px] leading-6">
      <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-border px-4">
        <span className="min-w-3 text-center text-foreground-muted">{line}</span>
      </div>
      <div className="flex min-w-0 items-center pl-1 font-normal">
        <span className="w-3 shrink-0 text-foreground-muted"> </span>
        <span className="whitespace-pre text-foreground">{text}</span>
      </div>
    </div>
  );
}
