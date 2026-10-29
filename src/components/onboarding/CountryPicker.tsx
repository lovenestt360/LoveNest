import { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

/** A bandeira do país (imagem, igual em todos os telemóveis); "Outro país" mostra o globo. */
function Flag({ code, className }: { code: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    if (code === "XX" || failed) {
        return <Globe className={cn("h-[18px] w-6 shrink-0 text-muted-foreground", className)} strokeWidth={1.5} />;
    }
    return (
        <img
            src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn("h-[18px] w-6 shrink-0 rounded-[4px] object-cover shadow-[0_0_0_1px_rgba(11,19,36,0.08)]", className)}
        />
    );
}

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
                    {selected
                        ? <Flag code={selected.code} />
                        : <Globe className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />}
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
                                    className="gap-3 py-2.5"
                                >
                                    <Flag code={country.code} />
                                    <span className="flex-1">{country.name}</span>
                                    <Check className={cn("h-4 w-4", value === country.code ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
