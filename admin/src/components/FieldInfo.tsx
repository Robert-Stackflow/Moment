import { IconButton } from "@robert-stackflow/oneui";
import { Info } from "lucide-react";
import { useId } from "react";
export function FieldInfo({
  label,
  content,
}: {
  label: string;
  content: string;
}) {
  const id = useId();
  return (
    <>
      <span id={id} hidden>
        {label}
      </span>
      <IconButton label={content} aria-labelledby={id} size="small">
        <Info size={15} />
      </IconButton>
    </>
  );
}
