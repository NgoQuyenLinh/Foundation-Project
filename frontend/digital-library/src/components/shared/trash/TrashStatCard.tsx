import { cn } from "@/utils/cn";

interface TrashStatCardProps {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string | number;
  description: string;
}

export function TrashStatCard({
  icon,
  iconClassName,
  label,
  value,
  description,
}: TrashStatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          iconClassName
        )}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 text-lg font-semibold leading-5 text-gray-900">
          {value}
        </p>
        <p className="mt-1 truncate text-[10px] text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
}