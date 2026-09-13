import { createRoot } from "react-dom/client";
import { reconcileExclusiveSession } from "./lib/session";
import "./index.css";

const rootEl = document.getElementById("root");

const showBootError = (error: unknown) => {
  console.error("MathLift failed to start:", error);
  if (!rootEl) return;
  const message = error instanceof Error ? error.message : "The app could not start.";
  rootEl.innerHTML = `
    <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:2rem;background:#181b2e;color:#e8eef8;font-family:system-ui,sans-serif;">
      <div style="max-width:28rem;text-align:center;">
        <h1 style="font-size:1.5rem;margin:0 0 0.75rem;">MathLift could not open</h1>
        <p style="color:#a8b0c2;line-height:1.5;margin:0 0 1.25rem;">${message}</p>
        <button type="button" onclick="location.reload()" style="min-height:48px;padding:0 1.25rem;border:0;border-radius:12px;background:#4f8fc0;color:#fff;font-weight:600;cursor:pointer;">
          Try again
        </button>
      </div>
    </div>
  `;
};

const start = async () => {
  if (!rootEl) {
    throw new Error("Missing root element.");
  }
  try {
    reconcileExclusiveSession();
  } catch (error) {
    console.error(error);
  }
  const { default: App } = await import("./App");
  createRoot(rootEl).render(<App />);
};

void start().catch(showBootError);
