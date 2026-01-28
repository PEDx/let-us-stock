import { useEffect, useState } from "react";
import { createLedger } from "~/lib/double-entry/ledger";
import type { LedgerData } from "~/lib/double-entry/types";
import { useAuth } from "~/lib/firebase/auth-context";
import {
  fetchLedgerSnapshot,
  initializeAccounting,
} from "~/lib/firebase/repository";
import { createDemoLedger } from "./demo-ledger";

export type LedgerSource = "cloud" | "demo" | "empty";

type LedgerState = {
  ledger: LedgerData | null;
  isLoading: boolean;
  error: string | null;
  source: LedgerSource;
};

export function useLedgerData() {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<LedgerState>({
    ledger: null,
    isLoading: true,
    error: null,
    source: "demo",
  });

  const load = async (active: { current: boolean }) => {
    if (!user) {
      if (!active.current) return;
      setState({
        ledger: createDemoLedger(),
        isLoading: false,
        error: null,
        source: "demo",
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      let ledger = await fetchLedgerSnapshot(user.id);
      if (!ledger) {
        await initializeAccounting(user.id);
        ledger = await fetchLedgerSnapshot(user.id);
      }
      if (!active.current) return;
      if (ledger) {
        setState({ ledger, isLoading: false, error: null, source: "cloud" });
      } else {
        setState({
          ledger: createLedger({ name: "Main", defaultCurrency: "CNY" }),
          isLoading: false,
          error: null,
          source: "empty",
        });
      }
    } catch (error) {
      if (!active.current) return;
      setState({
        ledger: createDemoLedger(),
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load ledger",
        source: "demo",
      });
    }
  };

  useEffect(() => {
    if (authLoading) return;
    const active = { current: true };
    void load(active);
    return () => {
      active.current = false;
    };
  }, [authLoading, user]);

  const reload = async () => {
    const active = { current: true };
    await load(active);
  };

  return { ...state, reload };
}
