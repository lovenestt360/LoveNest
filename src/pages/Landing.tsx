import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "@/features/landing/landing.css";
import { LANDING_ASSETS, landingMarkup } from "@/features/landing/landingMarkup";
import { mountLanding } from "@/features/landing/landingRuntime";

/**
 * Página inicial: os Guardiões recebem quem chega, conversam, e cada função
 * da app é sentida ao descer (ecrãs reais, chat, humor, agenda, cápsula, chama).
 */
export default function Landing() {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const referral = searchParams.get("ref");
    if (!referral) return;
    const normalized = referral.toUpperCase();
    sessionStorage.setItem("lovenest_ref", normalized);
    localStorage.setItem("lovenest_ref", normalized);
  }, [searchParams]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    // A marcação é posta de novo a cada montagem, para o comportamento começar do zero.
    root.innerHTML = landingMarkup(LANDING_ASSETS);
    return mountLanding(root, {
      A: LANDING_ASSETS,
      onStart: () => navigate("/inicio"),
      onLogin: () => navigate("/entrar?returning=1"),
    });
  }, [navigate]);

  return <div ref={ref} className="lp" />;
}
