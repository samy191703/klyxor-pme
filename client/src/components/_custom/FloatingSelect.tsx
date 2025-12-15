import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function FloatingSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="peer w-full h-12 px-3 pt-5 text-sm border rounded-md">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
      <label
        className={`
          absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm
          transition-all duration-200
          peer-focus:-top-2 peer-focus:text-xs peer-focus:text-[var(--klyxor-bleu-nuit)]
          ${value ? "-top-2 text-xs text-[var(--klyxor-bleu-nuit)]" : ""}
        `}
      >
        {label}
      </label>
    </div>
  );
}
