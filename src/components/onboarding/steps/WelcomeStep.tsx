import { AuthHeader, AuthPage, PrimaryButton, Reveal } from "@/features/auth/AuthKit";

/**
 * Ponte entre a conta criada e a personalização. Sem ícones decorativos:
 * diz o que vem a seguir, quanto tempo leva e o que fica privado.
 */
export function WelcomeStep({ onContinue, name }: { onContinue: () => void; name?: string }) {
    const first = name?.trim().split(/\s+/)[0];

    return (
        <AuthPage>
            <AuthHeader />

            <section className="flex flex-1 flex-col justify-center py-10">
                <Reveal>
                    <p className="text-[13px] font-semibold text-slate-400">
                        {first ? `Olá, ${first}.` : "Olá."}
                    </p>
                    <h1 className="mt-2 max-w-[16ch] text-[31px] font-extrabold leading-[1.08] tracking-[-0.038em]">
                        Antes de entrares, conta-nos um pouco de ti.
                    </h1>
                    <p className="mt-3 max-w-[34ch] text-[15px] leading-[1.55] text-slate-500">
                        Cinco perguntas curtas, menos de um minuto. Podes saltar qualquer uma.
                    </p>
                </Reveal>

                <Reveal delay={0.08} className="mt-9">
                    <dl className="border-y border-[#0B1324]/[0.08] text-[14px]">
                        {[
                            { k: "O que perguntamos", v: "País, como falar contigo, fé, para quem é, o que procuras." },
                            { k: "Para quê", v: "Para a tua Home mostrar o que importa, e esconder o resto." },
                        ].map((row) => (
                            <div key={row.k} className="border-b border-[#0B1324]/[0.06] py-3.5 last:border-b-0">
                                <dt className="text-[11px] font-semibold text-slate-400">{row.k}</dt>
                                <dd className="mt-0.5 leading-[1.5] text-slate-600">{row.v}</dd>
                            </div>
                        ))}
                    </dl>
                </Reveal>
            </section>

            <footer>
                <PrimaryButton type="button" onClick={onContinue} arrow>
                    Começar
                </PrimaryButton>
            </footer>
        </AuthPage>
    );
}
