// Entrada do protótipo Landing V4 (servida só pelo dev server em /prototypes/landing-v4.html).
// Isolada: não é importada por nenhum ficheiro de produção.
import { createRoot } from "react-dom/client";
import "@/index.css";
import "./proto.css";
import { Harness } from "./Harness";

createRoot(document.getElementById("root")!).render(<Harness />);
