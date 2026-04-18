import { useState, useEffect, useCallback } from "react";
import { creditService } from "../services/creditService";

export const useCredit = () => {
  const [credit, setCredit] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCredit = useCallback(async () => {
    setLoading(true);
    try {
      const [creditData, ledgerData] = await Promise.all([
        creditService.getCreditInfo(),
        creditService.getLedger(),
      ]);

      setCredit(creditData);
      setLedger(ledgerData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredit();
  }, [fetchCredit]);

  return { credit, ledger, loading, error };
};