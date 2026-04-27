import { useState, useEffect, useCallback } from 'react';
import { companyService } from '../services/companyService';

export const useCompany = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await companyService.getCompany();
      setCompany(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCompany = async (companyData) => {
    setLoading(true);
    setError(null);
    setUpdateSuccess(false);
    try {
      const data = await companyService.updateCompany(companyData);
      setCompany(data);
      setUpdateSuccess(true);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  return {
    company,
    loading,
    error,
    updateSuccess,
    fetchCompany,
    updateCompany
  };
};