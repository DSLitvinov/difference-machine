import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { bootstrapAppearance } from "@/lib/applyAppearance";
import "./index.css";

bootstrapAppearance();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
