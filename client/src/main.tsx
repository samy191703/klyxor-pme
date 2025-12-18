import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("[KLYXOR] main.tsx loaded", new Date().toISOString());

createRoot(document.getElementById("root")!).render(<App />);
