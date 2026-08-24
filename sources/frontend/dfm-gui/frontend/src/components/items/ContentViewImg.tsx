export function ContentViewImg({ src }: { src?: string }) {
  return (
    <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-auto">
      {src ? <img src={src} alt="" className="max-h-full max-w-full object-contain" /> : null}
    </div>
  );
}
