'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface PeriodSelectorProps {
  value: Period;
  onChange: (value: Period) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Period)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="daily">Daily (7 days)</SelectItem>
        <SelectItem value="weekly">Weekly (4 weeks)</SelectItem>
        <SelectItem value="monthly">Monthly (3 months)</SelectItem>
        <SelectItem value="quarterly">Quarterly (2 quarters)</SelectItem>
      </SelectContent>
    </Select>
  );
}
