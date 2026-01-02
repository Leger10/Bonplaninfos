import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const TimePickerColumn = ({ options, value, onChange, type }) => {
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const selectedElement = scrollRef.current.querySelector(`[data-value="${value}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'center' });
      }
    }
  }, [value]); // Only scroll on initial render or value change if needed

  return (
    <ScrollArea className="h-[200px] w-full border rounded-md" ref={scrollRef}>
      <div className="flex flex-col p-2 gap-1">
        {options.map((option) => (
          <button
            key={option}
            data-value={option}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(option);
            }}
            className={cn(
              "h-10 w-full rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              value === option
                ? "bg-primary text-primary-foreground font-bold scale-105"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            {option} {type === 'hour' ? 'h' : ''}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

const DateTimePickerContent = ({ date, setDate, time, setTime, onClose, isMobile }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); // Steps of 5 min

  const [localDate, setLocalDate] = useState(date || new Date());
  const [localHour, setLocalHour] = useState(time?.split(':')[0] || '12');
  const [localMinute, setLocalMinute] = useState(time?.split(':')[1] || '00');

  const handleConfirm = () => {
    setDate(localDate);
    setTime(`${localHour}:${localMinute}`);
    onClose();
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-4">
        <div className="space-y-2">
          <h4 className="font-medium leading-none text-center text-muted-foreground uppercase text-xs tracking-wider mb-3">Date</h4>
          <div className="flex justify-center border rounded-lg p-2 bg-card/50">
            <Calendar
              mode="single"
              selected={localDate}
              onSelect={(d) => d && setLocalDate(d)}
              initialFocus
              locale={fr}
              className="rounded-md"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium leading-none text-center text-muted-foreground uppercase text-xs tracking-wider mb-3">Heure</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center space-y-1">
              <span className="text-xs text-muted-foreground">Heures</span>
              <TimePickerColumn 
                options={hours} 
                value={localHour} 
                onChange={setLocalHour} 
                type="hour"
              />
            </div>
            <div className="text-center space-y-1">
              <span className="text-xs text-muted-foreground">Minutes</span>
              <TimePickerColumn 
                options={minutes} 
                value={localMinute} 
                onChange={setLocalMinute} 
                type="minute"
              />
            </div>
          </div>
        </div>
      </div>
      
      <Button onClick={handleConfirm} className="w-full mt-2 font-bold bg-primary text-white shadow-lg shadow-primary/20">
        <Check className="mr-2 h-4 w-4" />
        Valider {format(localDate, 'dd/MM/yyyy', { locale: fr })} à {localHour}:{localMinute}
      </Button>
    </div>
  );
};

const MobileDateTimePiker = ({ value, onChange, placeholder = "Choisir une date", className }) => {
  const [date, setDate] = useState(value ? new Date(value) : null);
  const [time, setTime] = useState(value ? format(new Date(value), 'HH:mm') : '12:00');
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Sync internal state when prop value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setDate(d);
        setTime(format(d, 'HH:mm'));
      }
    }
  }, [value]);

  // Update parent when date or time changes via picker confirmation
  const updateParent = (newDate, newTime) => {
    if (newDate && newTime) {
      const [h, m] = newTime.split(':');
      const finalDate = new Date(newDate);
      finalDate.setHours(parseInt(h), parseInt(m));
      onChange({ target: { value: finalDate.toISOString() } }); // Mimic event object for compatibility
    }
  };

  const displayValue = date && time 
    ? `${format(date, "d MMMM yyyy", { locale: fr })} à ${time}` 
    : placeholder;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-12 text-base",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-5 w-5" />
            {displayValue}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Choisir la date et l'heure</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">
            <DateTimePickerContent 
              date={date} 
              setDate={setDate} 
              time={time} 
              setTime={setTime} 
              onClose={() => {
                const [h, m] = time.split(':');
                const d = date || new Date();
                d.setHours(parseInt(h), parseInt(m));
                updateParent(d, time);
                setIsOpen(false);
              }} 
              isMobile={true} 
            />
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Annuler</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-12",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DateTimePickerContent 
          date={date} 
          setDate={setDate} 
          time={time} 
          setTime={setTime} 
          onClose={() => {
            const [h, m] = time.split(':');
            const d = date || new Date();
            d.setHours(parseInt(h), parseInt(m));
            updateParent(d, time);
            setIsOpen(false);
          }} 
          isMobile={false} 
        />
      </PopoverContent>
    </Popover>
  );
};

export default MobileDateTimePiker;