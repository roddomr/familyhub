import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  className?: string;
}

export const ColorPicker = ({ 
  value, 
  onChange, 
  presets = [],
  className 
}: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState(value);
  const [open, setOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
        >
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-sm">{value.toUpperCase()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          {/* Color Presets */}
          {presets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Presets</h4>
              <div className="grid grid-cols-5 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    className={cn(
                      "w-8 h-8 rounded border-2 transition-all hover:scale-110",
                      value === preset ? "border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: preset }}
                    onClick={() => handleColorSelect(preset)}
                    title={preset}
                  >
                    {value === preset && (
                      <Check className="h-4 w-4 text-white drop-shadow-lg" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Color Input */}
          <div>
            <h4 className="text-sm font-medium mb-2">Custom Color</h4>
            <div className="flex gap-2">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    onChange(e.target.value);
                  }
                }}
                placeholder="#3B82F6"
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};