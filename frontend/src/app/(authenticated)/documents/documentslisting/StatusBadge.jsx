import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, RotateCcw } from "lucide-react";

const STATUS_CONFIG = {
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "border-green-500 text-green-600",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-orange-500",
  },
  reupload: {
    label: "Reupload",
    icon: RotateCcw,
    className: "border-red-500 text-red-500",
  },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return (
      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
        N/A
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`
        inline-flex items-center gap-2
        rounded-full
        px-3 py-1
        text-xs font-medium
        ${config.className}
      `}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </Badge>
  );
};

export default StatusBadge;