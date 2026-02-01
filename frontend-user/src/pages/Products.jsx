// src/pages/Products.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import FilterPanel from "../components/FilterPanel";
import { fetchProducts } from "../services/api"; // Import the new API function
import { toast } from "sonner";

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    minPrice: "",
    maxPrice: "",
    brand: "",
  });

  // Categories will now be fetched by FilterPanel
  // const categories = ['CPUs', 'GPUs', 'RAM', 'Storage', 'Motherboards', 'Cases', 'PSUs', 'Peripherals'];

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError(null); // Clear previous errors
        setLoading(true); // Ensure loading is true before fetch
        const data = await fetchProducts(); // Fetch from real API
        setProducts(data);
        setFilteredProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError(
          error.message || "Failed to load products. Please try again later.",
        ); // Set error message
        toast.error("Failed to load products. Please try again later."); // Show toast
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter((p) =>
        p.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }
    if (filters.minPrice) {
      filtered = filtered.filter((p) =>
        p.price >= parseFloat(filters.minPrice)
      );
    }
    if (filters.maxPrice) {
      filtered = filtered.filter((p) =>
        p.price <= parseFloat(filters.maxPrice)
      );
    }
    if (filters.brand) {
      filtered = filtered.filter((p) =>
        p.brand.toLowerCase().includes(filters.brand.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [filters, products]);

  const handleFilterChange = (key, value) => {
    if (key === "reset") {
      setFilters({ category: "", minPrice: "", maxPrice: "", brand: "" });
      setSearchParams({});
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
      if (value) {
        setSearchParams({ [key]: value });
      } else {
        searchParams.delete(key);
        setSearchParams(searchParams);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-base-300 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 ">Products</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Panel */}
        <div className="lg:col-span-1">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            // categories={categories} // No longer passed
          />
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-3">
          {loading
            ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card bg-gray-800 shadow-xl">
                    <div className="skeleton h-48 w-full bg-gray-700"></div>
                    <div className="card-body">
                      <div className="skeleton h-4 w-3/4 mb-2 bg-gray-700">
                      </div>
                      <div className="skeleton h-4 w-full mb-2 bg-gray-700">
                      </div>
                      <div className="skeleton h-4 w-1/2 mb-4 bg-gray-700">
                      </div>
                      <div className="skeleton h-8 w-full bg-gray-700"></div>
                    </div>
                  </div>
                ))}
              </div>
            )
            : error
            ? ( // Show error state if error occurred
              <div className="text-center py-12">
                <p className="text-xl mb-4 text-error">
                  Error loading products: {error}
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.reload()} // Simple retry mechanism
                >
                  Retry
                </button>
              </div>
            )
            : (
              <>
                <p className="mb-4 ">
                  Showing {filteredProducts.length} of {products.length}{" "}
                  products
                </p>

                {filteredProducts.length === 0
                  ? (
                    <div className="text-center py-12">
                      <p className="text-xl mb-4 ">
                        No products found matching your criteria.
                      </p>
                      <button
                        className="btn btn-secondary bg-gray-700 hover:bg-gray-600 "
                        onClick={() => handleFilterChange("reset")}
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
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default Products;
