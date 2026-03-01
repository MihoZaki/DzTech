// src/pages/Products.jsx
import React, { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "../components/ProductCard";
import FilterPanel from "../components/FilterPanel";
import {
  fetchCategories,
  searchProducts, // Keep using searchProducts
} from "../services/api";
import { toast } from "sonner";

// Mapping between URL-friendly names and actual category names from backend
const CATEGORY_URL_TO_NAME = {
  cpus: "CPU",
  gpus: "GPU",
  ram: "RAM",
  storage: "Storage",
  motherboards: "Motherboard",
  cases: "Case",
  psus: "Power Supply",
  peripherals: "Accessories",
  coolers: "Cooler",
  laptops: "Laptop",
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // State for filters (managed locally or could be derived from URL params)
  const [tempFilters, setTempFilters] = useState({
    category: searchParams.get("category") || "",
    query: searchParams.get("q") || "", // Add this line for search query
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    brand: searchParams.get("brand") || "",
    inStockOnly: searchParams.get("inStockOnly") === "true" || false,
    includeDiscountedOnly:
      searchParams.get("includeDiscountedOnly") === "true" || false,
    specFilter: searchParams.get("specFilter") || "",
  }); // State to track the current applied filters
  const [appliedFilters, setAppliedFilters] = useState(tempFilters);

  // Sync appliedFilters when URL search params change (e.g., from Navbar)
  React.useEffect(() => {
    const newFilters = {
      category: searchParams.get("category") || "",
      query: searchParams.get("q") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      brand: searchParams.get("brand") || "",
      inStockOnly: searchParams.get("inStockOnly") === "true" || false,
      includeDiscountedOnly: searchParams.get("includeDiscountedOnly") === "true" || false,
      specFilter: searchParams.get("specFilter") || "",
    };

    setTempFilters(newFilters);       // Update tempFilters for UI
    setAppliedFilters(newFilters);    // Update appliedFilters for API query
  }, [searchParams]);

  // Fetch categories using useQuery
  const {
    data: categories = [], // Default to empty array
    isLoading: categoriesLoading,
    isError: categoriesError,
    error: categoriesApiError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories, // Direct function call
    staleTime: 15 * 60 * 1000, // Cache for 15 minutes
  });

  // Map category name to ID using the fetched categories list
  // We need this mapping to convert the filter name (e.g., "GPU") to the required category_id for the API
  const categoryNameToIdMap = useMemo(() => {
    if (!categories || !Array.isArray(categories)) return {};
    const map = {};
    categories.forEach((cat) => {
      map[cat.name] = cat.id;
    });
    return map;
  }, [categories]); // Recalculate map when categories change

  // Build search parameters object based on current filters
  // This function is memoized to avoid unnecessary recalculations on every render
  const buildSearchParams = useMemo(() => {
    // This inner function will be called inside the queryFn
    return () => {
      const params = {
        page: 1, // Default page
        limit: 50, // Default limit
      };

      // Apply category filter - Convert URL-friendly name to actual category name then to ID
      let actualCategoryName = appliedFilters.category;

      // Check if the filter category is a URL-friendly name that needs conversion
      if (CATEGORY_URL_TO_NAME[appliedFilters.category]) {
        actualCategoryName = CATEGORY_URL_TO_NAME[appliedFilters.category];
      } else if (appliedFilters.category) {
        // If no direct mapping found, try to convert the URL parameter to title case
        // For example: "cpu-cooler" becomes "Cpu Cooler", "power-supply" becomes "Power Supply"
        const convertedName = appliedFilters.category
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // Check if the converted name exists in the category map
        if (categoryNameToIdMap[convertedName]) {
          actualCategoryName = convertedName;
        } else {
          // As a last resort, check if the original URL parameter exists in the category map
          // This handles cases where the URL parameter matches the actual category name
          if (categoryNameToIdMap[appliedFilters.category]) {
            actualCategoryName = appliedFilters.category;
          }
        }
      }

      // Check if the actual category name exists in our map
      if (actualCategoryName && categoryNameToIdMap[actualCategoryName]) {
        params.category_id = categoryNameToIdMap[actualCategoryName];
      }
      // If the selected category name is not found in the map, the filter is ignored
      // This can happen if categories change or the filter name is invalid

      // Apply price range filter - Convert DZD to cents
      if (appliedFilters.minPrice) {
        const minPriceCents = parseFloat(appliedFilters.minPrice) * 100; // Assuming input is in DZD
        // Validate conversion
        if (!isNaN(minPriceCents) && minPriceCents > 0) {
          params.min_price = Math.round(minPriceCents); // Round to nearest cent
        }
      }
      if (appliedFilters.maxPrice) {
        const maxPriceCents = parseFloat(appliedFilters.maxPrice) * 100; // Assuming input is in DZD
        // Validate conversion
        if (!isNaN(maxPriceCents) && maxPriceCents > 0) {
          params.max_price = Math.round(maxPriceCents); // Round to nearest cent
        }
      }
      // Apply search query filter
      if (appliedFilters.query) {
        params.q = appliedFilters.query;
      }
      // Apply brand filter
      if (appliedFilters.brand) {
        params.brand = appliedFilters.brand;
      }

      // Apply in stock only filter
      if (appliedFilters.inStockOnly) {
        params.in_stock_only = true;
      }

      // Apply include discounted only filter
      if (appliedFilters.includeDiscountedOnly) {
        params.include_discounted_only = true;
      }

      // Apply spec filter
      if (appliedFilters.specFilter) {
        params.spec_filter = appliedFilters.specFilter;
      }

      return params;
    };
  }, [appliedFilters, categoryNameToIdMap, CATEGORY_URL_TO_NAME]); // Dependency on appliedFilters and the name-to-id map

  // Fetch products using searchProducts and current filters via useQuery
  // The queryKey now includes the filters state, ensuring a new request when filters change
  const {
    data: productsData = {
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 1,
    }, // Provide a default structure
    isLoading: productsLoading,
    isError: productsError,
    error: productsApiError,
    refetch: refetchProducts, // Function to manually refetch if needed
  } = useQuery({
    queryKey: ["searchProducts", appliedFilters, categories], // Include applied filters and categories (for mapping) in key
    queryFn: async () => {
      // Get the current parameters based on the latest filters and category map
      const currentParams = buildSearchParams();
      // Call searchProducts with the constructed parameters
      const result = await searchProducts(currentParams);
      return result; // Return the API response object
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes based on filters
    enabled: categories.length > 0, // Only run the search query once categories are loaded (for mapping)
  });

  // Destructure products array and pagination info from productsData
  const { data: products = [] } = productsData; // Destructure the 'data' key

  // Combine loading states if needed for a single spinner covering both products and categories
  const overallLoading = productsLoading || categoriesLoading;

  // Combine error states if needed
  const overallError = productsError || categoriesError;
  const overallErrorMessage = productsApiError?.message ||
    categoriesApiError?.message || "An unknown error occurred";

  // Memoize filtered products - now it's just the products returned by the API based on filters
  // We rely on the backend filtering via searchProducts
  const filteredProducts = useMemo(() => {
    return products;
  }, [products]); // Dependency on products from the query result

  // Handle filter changes (update temp filters, not applied filters)
  const handleFilterChange = (key, value) => {
    setTempFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Apply filters function
  const applyFilters = useCallback(() => {
    setAppliedFilters(tempFilters);

    // Update URL search params based on applied filters
    const newParams = {};
    if (tempFilters.category) newParams.category = tempFilters.category;
    if (tempFilters.query) newParams.q = tempFilters.query;
    if (tempFilters.minPrice) newParams.minPrice = tempFilters.minPrice;
    if (tempFilters.maxPrice) newParams.maxPrice = tempFilters.maxPrice;
    if (tempFilters.brand) newParams.brand = tempFilters.brand;
    if (tempFilters.inStockOnly) {
      newParams.inStockOnly = tempFilters.inStockOnly.toString();
    }
    if (tempFilters.includeDiscountedOnly) {
      newParams.includeDiscountedOnly = tempFilters.includeDiscountedOnly
        .toString();
    }
    if (tempFilters.specFilter) newParams.specFilter = tempFilters.specFilter;

    setSearchParams(newParams);
  }, [tempFilters, setSearchParams]);

  // Reset filters function
  const resetFilters = useCallback(() => {
    const resetValues = {
      category: "",
      query: "",
      minPrice: "",
      maxPrice: "",
      brand: "",
      inStockOnly: false,
      includeDiscountedOnly: false,
      specFilter: "",
    };
    setTempFilters(resetValues);
    setAppliedFilters(resetValues);
    setSearchParams({});
  }, [setSearchParams]);

  // Handle loading states (both products and categories)
  if (overallLoading) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
        <h1 className="text-3xl font-bold mb-8 ">Products</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Panel Skeleton */}
          <div className="lg:col-span-1">
            <div className="bg-base-100 p-4 rounded-lg shadow-md border border-neutral-content">
              <div className="skeleton h-4 w-1/4 mb-4"></div>
              <div className="skeleton h-10 w-full mb-4"></div>
              <div className="skeleton h-10 w-full mb-4"></div>
              <div className="skeleton h-10 w-full mb-4"></div>
              <div className="skeleton h-8 w-full"></div>
            </div>
          </div>
          {/* Product Grid Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card bg-inherit shadow-xl">
                  <div className="skeleton h-48 w-full bg-gray-700/50"></div>
                  <div className="card-body">
                    <div className="skeleton h-4 w-3/4 mb-2 bg-gray-700/50">
                    </div>
                    <div className="skeleton h-4 w-full mb-2 bg-gray-700/50">
                    </div>
                    <div className="skeleton h-4 w-1/2 mb-4 bg-gray-700/50">
                    </div>
                    <div className="skeleton h-8 w-full bg-gray-700/50"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error states (either products or categories)
  if (overallError) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
        <h1 className="text-3xl font-bold mb-8 ">Products</h1>
        <div className="text-center py-12">
          <p className="text-xl mb-4 text-error">
            Error loading {overallErrorMessage}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              refetchProducts(); /* Add refetch for categories if needed */
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <h1 className="text-3xl font-bold mb-8 ">Products</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Panel - Pass categories and loading state if needed */}
        <div className="lg:col-span-1">
          <FilterPanel
            filters={tempFilters}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onResetFilters={resetFilters}
            categories={categories} // Pass the categories fetched by useQuery
            loading={categoriesLoading} // Pass loading state if FilterPanel needs it
          />
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {filteredProducts.length === 0
            ? (
              <div className="text-center py-12">
                <p className="text-xl mb-4 ">
                  No products found matching your criteria.
                </p>
                <button
                  className="btn btn-secondary bg-gray-700 hover:bg-gray-600 "
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>
              </div>
            )
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Products;
