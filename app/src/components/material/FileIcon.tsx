import { FileText, Presentation, Video, File } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FileIconProps {
  mimeType: string;
  fileName: string;
}

function getTypeLabel(mimeType: string): { icon: typeof File; label: string } {
  if (mimeType.startsWith("video/")) return { icon: Video, label: "Video" };
  if (mimeType === "application/pdf") return { icon: FileText, label: "PDF" };
  if (mimeType.includes("presentationml")) return { icon: Presentation, label: "PPT" };
  if (mimeType.includes("wordprocessingml")) return { icon: FileText, label: "DOC" };
  if (mimeType === "text/plain") return { icon: FileText, label: "TXT" };
  return { icon: File, label: "File" };
}

export default function FileIcon({ mimeType, fileName: _fileName }: FileIconProps) {
  const { icon: Icon, label } = getTypeLabel(mimeType);
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-full">
      <Icon size={48} className="text-cabinet-inkMuted" />
      <Badge variant="secondary">{label}</Badge>
    </div>
  );
}
