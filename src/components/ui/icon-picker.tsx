import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  icons?: string[];
  className?: string;
}

export const IconPicker = ({ 
  value, 
  onChange, 
  icons = [],
  className 
}: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Get the icon component
  const IconComponent = (Icons as any)[value] || Icons.Hash;

  // Filter icons based on search
  const filteredIcons = icons.filter(iconName =>
    iconName.toLowerCase().includes(search.toLowerCase())
  );

  const handleIconSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2", className)}
        >
          <IconComponent className="w-4 h-4" />
          <span className="text-sm">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Icons Grid */}
          <ScrollArea className="h-64">
            <div className="grid grid-cols-6 gap-1">
              {filteredIcons.map((iconName) => {
                const Icon = (Icons as any)[iconName];
                if (!Icon) return null;

                return (
                  <button
                    key={iconName}
                    className={cn(
                      "p-2 rounded hover:bg-accent transition-colors relative",
                      value === iconName && "bg-accent"
                    )}
                    onClick={() => handleIconSelect(iconName)}
                    title={iconName}
                  >
                    <Icon className="w-5 h-5" />
                    {value === iconName && (
                      <Check className="absolute -top-1 -right-1 h-3 w-3 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {filteredIcons.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No icons found
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};