import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { reconcileExclusiveSession } from "./lib/session";
import "./index.css";

reconcileExclusiveSession();

createRoot(document.getElementById("root")!).render(<App />);
