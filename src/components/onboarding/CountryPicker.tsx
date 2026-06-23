import { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

export function CountryPicker({ value, onSelect }: {
    value: string | null;
    onSelect: (countryCode: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const selected = COUNTRIES.find(c => c.code === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="w-full h-14 rounded-2xl border border-border bg-card px-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                >
                    <Globe className="w-5 h-5 text-rose-400 shrink-0" strokeWidth={1.5} />
                    <span className={cn("flex-1 text-[15px] font-semibold", !selected && "text-muted-foreground")}>
                        {selected ? selected.name : "Seleciona o teu país"}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(90vw,360px)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Procurar país..." />
                    <CommandList>
                        <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                        <CommandGroup>
                            {COUNTRIES.map(country => (
                                <CommandItem
                                    key={country.code}
                                    value={country.name}
                                    onSelect={() => {
                                        onSelect(country.code);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === country.code ? "opacity-100" : "opacity-0")} />
                                    {country.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
