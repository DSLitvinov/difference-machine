import { DiffTextSplitRow } from "@/components/atoms/DiffTextSplitRow";

export function ContentViewText({ text }: { text: string }) {
  const lines = text.length === 0 ? [""] : text.split("\n");
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
      {lines.map((line, index) => (
        <DiffTextSplitRow key={index} line={index + 1} text={line} />
      ))}
    </div>
  );
}
