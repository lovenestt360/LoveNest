import {
  CalendarHeart,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";

export function LandingProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-200/40 blur-[80px]"
      />

      <div className="relative mx-auto w-[290px] rounded-[2.7rem] border border-white/70 bg-[#101827] p-[7px] shadow-[0_38px_90px_rgba(15,23,42,0.28)] sm:w-[320px]">
        <div className="overflow-hidden rounded-[2.3rem] bg-[#FAF8F6]">
          <div className="flex items-center justify-between px-5 pb-2 pt-5">
            <div className="h-2.5 w-12 rounded-full bg-slate-900/10" />
            <div className="h-2.5 w-8 rounded-full bg-slate-900/10" />
          </div>

          <div className="px-4 pb-5">
            <div className="flex items-center justify-between py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-[11px] font-bold text-slate-500">D</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5">
                  <LogoMark size={18} />
                  <span className="text-[13px] font-extrabold tracking-tight text-[#0B1324]">LoveNest</span>
                </div>
                <span className="mt-0.5 text-[8px] font-medium text-slate-400">quinta, 8 de outubro</span>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-[11px] font-bold text-slate-500">M</span>
              </div>
            </div>

            <div className="relative mt-3 overflow-hidden rounded-[1.7rem] bg-[#0B1324] px-5 py-5 text-white shadow-[0_20px_45px_rgba(11,19,36,0.18)]">
              <div
                aria-hidden="true"
                className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-rose-400/25 blur-2xl"
              />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/45">A vossa chama</p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-[34px] font-black leading-none tracking-[-0.05em]">18</span>
                      <span className="pb-1 text-[9px] font-semibold text-white/50">dias juntos</span>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-400/15">
                    <Flame className="h-5 w-5 text-rose-300" strokeWidth={1.8} />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/[0.08] px-3 py-2.5">
                  <div className="flex -space-x-1.5">
                    <div className="h-5 w-5 rounded-full border-2 border-[#0B1324] bg-rose-300" />
                    <div className="h-5 w-5 rounded-full border-2 border-[#0B1324] bg-indigo-300" />
                  </div>
                  <p className="text-[8px] font-medium text-white/65">Os dois já apareceram hoje.</p>
                </div>
              </div>
            </div>

            <p className="mb-2 mt-5 text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">
              Hoje para vocês
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-3.5 py-3 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
                  <Heart className="h-4 w-4 text-rose-400" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-[#0B1324]">Como estás hoje?</p>
                  <p className="mt-0.5 text-[8px] text-slate-400">Partilha o teu estado com o teu par.</p>
                </div>
                <Sparkles className="h-3.5 w-3.5 text-slate-300" />
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-3.5 py-3 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  <MessageCircle className="h-4 w-4 text-indigo-400" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-[#0B1324]">Uma mensagem nova</p>
                  <p className="mt-0.5 truncate text-[8px] text-slate-400">“Guardei uma coisa para nós...”</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white px-3.5 py-3 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                  <CalendarHeart className="h-4 w-4 text-orange-400" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold text-[#0B1324]">Sexta-feira</p>
                  <p className="mt-0.5 text-[8px] text-slate-400">Noite só para vocês, às 19:30.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-1.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
              {[
                ["Hoje", Heart],
                ["Chat", MessageCircle],
                ["Nós", Sparkles],
                ["Vida", CalendarHeart],
              ].map(([label, Icon], index) => {
                const IconComponent = Icon as typeof Heart;
                return (
                  <div key={label as string} className="flex flex-col items-center gap-1">
                    <IconComponent
                      className={index === 0 ? "h-4 w-4 text-rose-500" : "h-4 w-4 text-slate-300"}
                      strokeWidth={1.8}
                    />
                    <span className={index === 0 ? "text-[7px] font-bold text-rose-500" : "text-[7px] font-medium text-slate-400"}>
                      {label as string}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
