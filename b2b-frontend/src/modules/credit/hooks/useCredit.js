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

      setCredit(creditData.data);
      setLedger(ledgerData.data || []);
      console.log("Credit Data Loaded:", creditData.data);
      console.log("Ledger Data Loaded:", ledgerData.data || []);
    } catch (err) {
      setError(err.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredit();
    
    // Refresh credit data when window regains focus (e.g. after returning from checkout)
    window.addEventListener('focus', fetchCredit);
    return () => window.removeEventListener('focus', fetchCredit);
  }, [fetchCredit]);

  return { credit, ledger, loading, error };
};