import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { PriceAlertProvider } from "./PriceAlert.jsx";

/**
 * We lift `prices` up here so PriceAlertProvider can watch live prices
 * and fire alert toasts automatically. App receives prices as a prop.
 */

const STOCK_SYMBOLS = [
  "AAPL","TSLA","GOOGL","AMZN","MSFT",
  "NVDA","META","NFLX","AMD","SPOT","UBER","PYPL",
];
const BASE_PRICES = {
  AAPL: 189.84, TSLA: 242.60, GOOGL: 175.98, AMZN: 198.12,
  MSFT: 415.32, NVDA: 875.40, META:  528.75, NFLX: 634.20,
  AMD:  178.90, SPOT: 312.44, UBER:   78.34, PYPL:  65.12,
};

function Root() {
  const [prices, setPrices] = useState(BASE_PRICES);
  const [alertToast, setAlertToast] = useState(null);

  // Single source-of-truth ticker — shared by provider + App
  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        STOCK_SYMBOLS.forEach(sym => {
          const d = next[sym] * (Math.random() - 0.499) * 0.003;
          next[sym] = Math.max(1, +(next[sym] + d).toFixed(2));
        });
        return next;
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <PriceAlertProvider
      prices={prices}
      onToast={(msg, type) => setAlertToast({ msg, type, id: Date.now() })}
    >
      <App prices={prices} externalAlertToast={alertToast} />
    </PriceAlertProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
