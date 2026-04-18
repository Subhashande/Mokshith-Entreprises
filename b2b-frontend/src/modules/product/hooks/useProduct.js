import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { productService } from "../services/productService";
import { fetchStart, fetchProductsSuccess, fetchFailure } from "../productSlice";

export const useProduct = () => {
  const dispatch = useDispatch();
  const { products, loading, error } = useSelector((state) => state.product);

  const fetchProducts = useCallback(async () => {
    dispatch(fetchStart());
    try {
      const data = await productService.getProducts();
      dispatch(fetchProductsSuccess(data));
    } catch (err) {
      dispatch(fetchFailure(err.message));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error };
};