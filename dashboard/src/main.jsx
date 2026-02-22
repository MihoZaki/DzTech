import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // Make sure this is imported
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Wrap App with BrowserRouter */}
      <BrowserRouter>
        {/* Sonner Toaster for notifications */}
        <Toaster position="top-right" richColors />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
