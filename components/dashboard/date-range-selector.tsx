'use client';

import { useState } from 'react';
import {
  format,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

type PresetKey =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'last90days'
  | 'thisWeek'
  | 'lastWeek'
  | 'monthToDate'
  | 'lastMonth'
  | 'quarterToDate'
  | 'lastQuarter';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

function getPresetRange(key: PresetKey): DateRange {
  const today = new Date();
  const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

  const presets: Record<PresetKey, { start: Date; end: Date; label: string }> = {
    today: {
      start: today,
      end: today,
      label: 'Today',
    },
    yesterday: {
      start: subDays(today, 1),
      end: subDays(today, 1),
      label: 'Yesterday',
    },
    last7days: {
      start: subDays(today, 6),
      end: today,
      label: 'Last 7 days',
    },
    last30days: {
      start: subDays(today, 29),
      end: today,
      label: 'Last 30 days',
    },
    last90days: {
      start: subDays(today, 89),
      end: today,
      label: 'Last 90 days',
    },
    thisWeek: {
      start: startOfWeek(today, { weekStartsOn: 0 }),
      end: today,
      label: 'This week',
    },
    lastWeek: {
      start: startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }),
      end: endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 }),
      label: 'Last week',
    },
    monthToDate: {
      start: startOfMonth(today),
      end: today,
      label: 'Month to date',
    },
    lastMonth: {
      start: startOfMonth(subMonths(today, 1)),
      end: endOfMonth(subMonths(today, 1)),
      label: 'Last month',
    },
    quarterToDate: {
      start: startOfQuarter(today),
      end: today,
      label: 'Quarter to date',
    },
    lastQuarter: {
      start: startOfQuarter(subQuarters(today, 1)),
      end: endOfQuarter(subQuarters(today, 1)),
      label: 'Last quarter',
    },
  };

  const preset = presets[key];
  return {
    startDate: formatDate(preset.start),
    endDate: formatDate(preset.end),
    label: preset.label,
  };
}

export function getDefaultDateRange(): DateRange {
  return getPresetRange('last7days');
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);

  const handlePresetClick = (key: PresetKey) => {
    onChange(getPresetRange(key));
    setOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'MMM d, yyyy');
  };

  const displayText =
    value.startDate === value.endDate
      ? formatDisplayDate(value.startDate)
      : `${formatDisplayDate(value.startDate)} - ${formatDisplayDate(value.endDate)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4" align="start">
        <div className="space-y-4">
          {/* Quick ranges */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Quick</h4>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="Today"
                selected={value.label === 'Today'}
                onClick={() => handlePresetClick('today')}
              />
              <PresetButton
                label="Yesterday"
                selected={value.label === 'Yesterday'}
                onClick={() => handlePresetClick('yesterday')}
              />
              <PresetButton
                label="Last 7 days"
                selected={value.label === 'Last 7 days'}
                onClick={() => handlePresetClick('last7days')}
              />
              <PresetButton
                label="Last 30 days"
                selected={value.label === 'Last 30 days'}
                onClick={() => handlePresetClick('last30days')}
              />
              <PresetButton
                label="Last 90 days"
                selected={value.label === 'Last 90 days'}
                onClick={() => handlePresetClick('last90days')}
              />
            </div>
          </div>

          {/* Week ranges */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Weeks</h4>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="This week"
                selected={value.label === 'This week'}
                onClick={() => handlePresetClick('thisWeek')}
              />
              <PresetButton
                label="Last week"
                selected={value.label === 'Last week'}
                onClick={() => handlePresetClick('lastWeek')}
              />
            </div>
          </div>

          {/* Month ranges */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Months</h4>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="Month to date"
                selected={value.label === 'Month to date'}
                onClick={() => handlePresetClick('monthToDate')}
              />
              <PresetButton
                label="Last month"
                selected={value.label === 'Last month'}
                onClick={() => handlePresetClick('lastMonth')}
              />
            </div>
          </div>

          {/* Quarter ranges */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Quarters</h4>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                label="Quarter to date"
                selected={value.label === 'Quarter to date'}
                onClick={() => handlePresetClick('quarterToDate')}
              />
              <PresetButton
                label="Last quarter"
                selected={value.label === 'Last quarter'}
                onClick={() => handlePresetClick('lastQuarter')}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PresetButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className="h-8"
    >
      {label}
    </Button>
  );
}
