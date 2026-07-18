import type { ReactNode } from "react";
import { BlockEditor } from "@/components/block-editor";
import type { Block } from "@/lib/blocks";

export type RichEditorProps = {
  value: Block[];
  onChange: (blocks: Block[]) => void;
  readOnly?: boolean;
  onUploadImage?: (file: File) => Promise<string>;
  className?: string;
  emptyHint?: ReactNode;
};

/** Newsroom block-based rich editor (paragraph, heading, media, embeds, live). */
export function RichEditor({
  value,
  onChange,
  readOnly,
  onUploadImage,
  className,
}: RichEditorProps) {
  return (
    <div className={className}>
      <BlockEditor
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onUploadImage={onUploadImage}
      />
    </div>
  );
}

export type { Block };
