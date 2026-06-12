import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { productService } from "../services/productService";
import { fetchStart, fetchAllProductsStart, fetchProductsSuccess, fetchAllProductsSuccess, fetchCategoriesStart, fetchCategoriesSuccess, fetchCategoriesFailure, fetchFailure } from "../productSlice";

export const useProduct = () => {
  const dispatch = useDispatch();
  const { products, allProducts, categories, pagination, loading, allProductsLoading, categoriesLoading, error } = useSelector((state) => state.product);

  const fetchProducts = useCallback(async (params = {}) => {
    dispatch(fetchStart());
    try {
      const data = await productService.getProducts(params);
      dispatch(fetchProductsSuccess(data));
    } catch (err) {
      dispatch(fetchFailure(err.message));
    }
  }, [dispatch]);

  const fetchAllProducts = useCallback(async () => {
    dispatch(fetchAllProductsStart());
    try {
      const data = await productService.getProducts({ limit: 1000 });
      dispatch(fetchAllProductsSuccess(data));
    } catch (err) {
      dispatch(fetchFailure(err.message));
    }
  }, [dispatch]);

  const fetchCategories = useCallback(async () => {
    dispatch(fetchCategoriesStart());
    try {
      const data = await productService.getCategories();
      dispatch(fetchCategoriesSuccess(data));
    } catch (err) {
      dispatch(fetchCategoriesFailure(err.message));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchProducts();
    fetchAllProducts();
    fetchCategories();
  }, [fetchProducts, fetchAllProducts, fetchCategories]);

  return { 
    products, 
    allProducts, 
    categories, 
    pagination, 
    loading, 
    allProductsLoading, 
    categoriesLoading, 
    error,
    fetchProducts,
    fetchAllProducts
  };
};