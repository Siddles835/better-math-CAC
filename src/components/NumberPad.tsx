import React from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticTap } from '@/lib/haptics';

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
}

/** Big on-screen number pad for young students (avoids the mobile keyboard). */
const NumberPad: React.FC<NumberPadProps> = ({
  value,
  onChange,
  disabled = false,
  maxLength = 1,
}) => {
  const pressDigit = (digit: string) => {
    if (disabled || value.length >= maxLength) return;
    hapticTap();
    // Avoid leading zeros like "05"
    if (value === '0') {
      onChange(digit);
    } else {
      onChange(value + digit);
    }
  };

  const backspace = () => {
    if (disabled) return;
    hapticTap();
    onChange(value.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="bg-muted/50 border-2 border-border rounded-xl px-8 py-3 min-w-[110px] text-center"
        aria-live="polite"
      >
        <span className={`text-4xl font-bold ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {value || '?'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[240px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
          <Button
            key={digit}
            type="button"
            variant="outline"
            onClick={() => pressDigit(digit)}
            disabled={disabled}
            className="text-2xl h-14 w-[72px] transition-transform active:scale-95"
          >
            {digit}
          </Button>
        ))}
        <div />
        <Button
          type="button"
          variant="outline"
          onClick={() => pressDigit('0')}
          disabled={disabled}
          className="text-2xl h-14 w-[72px] transition-transform active:scale-95"
        >
          0
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={backspace}
          disabled={disabled || value.length === 0}
          aria-label="Delete last digit"
          className="h-14 w-[72px] transition-transform active:scale-95"
        >
          <Delete className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default NumberPad;
