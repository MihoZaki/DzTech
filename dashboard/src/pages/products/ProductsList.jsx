import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteProduct,
  fetchProducts,
  searchProducts,
} from "../../services/api";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const ProductsList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
    "http://localhost:8080";

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- State for Effective Search Criteria (drives the query) ---
  const [effectiveSearchCriteria, setEffectiveSearchCriteria] = useState({
    query: "",
    in_stock_only: false,
    include_discounted_only: false,
    category_id: "", // Include category_id in the criteria object
    brand: "",
    min_price: "",
    max_price: "",
    spec_filter: "",
  });

  // --- State for Input Fields (controls the UI) ---
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [inputInStockOnly, setInputInStockOnly] = useState(false);
  const [inputIncludeDiscountedOnly, setInputIncludeDiscountedOnly] = useState(
    false,
  );
  const [inputCategoryId, setInputCategoryId] = useState("");
  const [inputBrand, setInputBrand] = useState("");
  const [inputMinPrice, setInputMinPrice] = useState("");
  const [inputMaxPrice, setInputMaxPrice] = useState("");
  const [inputSpecFilter, setInputSpecFilter] = useState("");

  // Function to update effective criteria and reset page
  const updateEffectiveCriteriaAndResetPage = (newCriteria) => {
    setEffectiveSearchCriteria(newCriteria);
    setCurrentPage(1); // Reset page when criteria change
  };

  // --- Handlers for Input Changes (update UI state) ---
  const handleInputSearchTermChange = (e) => {
    setInputSearchTerm(e.target.value);
  };

  const handleInputInStockOnlyChange = (e) => {
    setInputInStockOnly(e.target.checked);
  };

  const handleInputIncludeDiscountedOnlyChange = (e) => {
    setInputIncludeDiscountedOnly(e.target.checked);
  };

  const handleInputCategoryIdChange = (e) => {
    setInputCategoryId(e.target.value);
  };

  const handleInputBrandChange = (e) => {
    setInputBrand(e.target.value);
  };

  const handleInputMinPriceChange = (e) => {
    setInputMinPrice(e.target.value);
  };

  const handleInputMaxPriceChange = (e) => {
    setInputMaxPrice(e.target.value);
  };

  const handleInputSpecFilterChange = (e) => {
    setInputSpecFilter(e.target.value);
  };

  // --- Handler for Search Button Click ---
  const handleSearchClick = () => {
    // Construct the new effective criteria object from input states
    const newCriteria = {
      query: inputSearchTerm,
      in_stock_only: inputInStockOnly,
      include_discounted_only: inputIncludeDiscountedOnly,
      category_id: inputCategoryId,
      brand: inputBrand,
      min_price: inputMinPrice !== "" ? parseInt(inputMinPrice, 10) : "",
      max_price: inputMaxPrice !== "" ? parseInt(inputMaxPrice, 10) : "",
      spec_filter: inputSpecFilter,
    };
    // Update the effective criteria which triggers the query
    updateEffectiveCriteriaAndResetPage(newCriteria);
  };

  // --- Handler for Search Form Submission ---
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    handleSearchClick();
  };

  // --- Determine query function and key based on effective criteria ---
  const hasEffectiveCriteria = Object.values(effectiveSearchCriteria).some(
    (value) => value !== "" && value !== false, // Check if any value is truthy (non-empty string, true boolean, non-zero number)
  );

  const queryFunction = hasEffectiveCriteria ? searchProducts : fetchProducts;

  // Build query parameters object for the API call
  const buildQueryParams = () => {
    const params = {
      page: currentPage,
      limit: itemsPerPage,
    };
    // Add criteria if they are active
    if (effectiveSearchCriteria.query) {
      params.query = effectiveSearchCriteria.query;
    }
    if (effectiveSearchCriteria.in_stock_only) params.in_stock_only = true;
    if (effectiveSearchCriteria.include_discounted_only) {
      params.include_discounted_only = true;
    }
    if (effectiveSearchCriteria.category_id) {
      params.category_id = effectiveSearchCriteria.category_id;
    }
    if (effectiveSearchCriteria.brand) {
      params.brand = effectiveSearchCriteria.brand;
    }
    if (effectiveSearchCriteria.min_price !== "") {
      params.min_price = effectiveSearchCriteria.min_price;
    }
    if (effectiveSearchCriteria.max_price !== "") {
      params.max_price = effectiveSearchCriteria.max_price;
    }
    if (effectiveSearchCriteria.spec_filter) {
      params.spec_filter = effectiveSearchCriteria.spec_filter;
    }
    return params;
  };

  // Build the query key including all criteria values
  const queryKey = hasEffectiveCriteria
    ? ["searchProducts", ...Object.values(buildQueryParams()).slice(2)] // Exclude page and limit from key if they are last two elements
    : ["products", currentPage, itemsPerPage];

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKey,
    queryFn: () => {
      const queryParams = buildQueryParams();
      if (hasEffectiveCriteria) {
        const { query, ...filters } = queryParams;
        return queryFunction(query, currentPage, itemsPerPage, filters);
      } else {
        return queryFunction(currentPage, itemsPerPage);
      }
    },
    select: (response) => {
      const { data, page, limit, total, total_pages } = response.data;
      return {
        products: data,
        pagination: { page, limit, total, totalPages: total_pages },
      };
    },
    staleTime: 1500,
    gcTime: 5 * 60 * 1000,
  });

  // Destructure data and pagination metadata
  const { products = [], pagination } = data || {};

  // Define the delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["searchProducts"] });
      toast.success(`Product ID ${deletedId} deleted successfully.`);
    },
    onError: (error, deletedId) => {
      console.error("Delete Error:", error);
      toast.error(
        `Failed to delete product ID ${deletedId}: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

  const handleDelete = (productId) => {
    if (
      window.confirm(
        `Are you sure you want to delete product ID: ${productId}? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(productId);
    }
  };

  // Handler for changing pages
  const goToPage = (newPage) => {
    if (pagination) {
      const { page: currentPageFromMeta, totalPages } = pagination;
      if (newPage >= 1 && (!totalPages || newPage <= totalPages)) {
        setCurrentPage(newPage);
      }
    } else {
      if (newPage >= 1) {
        setCurrentPage(newPage);
      }
    }
  };

  // Handler for changing items per page
  const handleItemsPerPageChange = (newLimit) => {
    setItemsPerPage(newLimit);
    setCurrentPage(1);
  };

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-error shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current flex-shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Error: {error.message}</span>
        <button onClick={() => refetch()} className="btn btn-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold">Products</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search by name/desc..."
              className="input input-bordered w-full flex-grow"
              value={inputSearchTerm}
              onChange={handleInputSearchTermChange}
              onClick={handleInputSearchTermChange}
            />
            <button type="submit" className="btn btn-primary">
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </form>
          <Link
            to="/admin/products/add"
            className="btn btn-accent flex items-center gap-2"
          >
            <PlusCircleIcon className="w-5 h-5" />
            Add Product
          </Link>
        </div>
      </div>

      {/* --- Filter Controls --- */}
      <div className="bg-base-100 p-4 rounded-box mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="form-control">
          <label className="cursor-pointer label flex items-center justify-between">
            <span className="label-text">In Stock Only</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={effectiveSearchCriteria.in_stock_only}
              onChange={handleInputInStockOnlyChange}
            />
          </label>
        </div>
        <div className="form-control">
          <label className="cursor-pointer label flex items-center justify-between">
            <span className="label-text">Discounted Only</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={effectiveSearchCriteria.include_discounted_only}
              onChange={handleInputIncludeDiscountedOnlyChange}
            />
          </label>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Brand</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Intel, AMD..."
            className="input input-bordered input-sm"
            value={inputBrand}
            onChange={handleInputBrandChange}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Min Price (cents)</span>
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g., 10000"
            className="input input-bordered input-sm"
            value={inputMinPrice}
            onChange={handleInputMinPriceChange}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Max Price (cents)</span>
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g., 1000000"
            className="input input-bordered input-sm"
            value={inputMaxPrice}
            onChange={handleInputMaxPriceChange}
          />
        </div>
        <div className="form-control md:col-span-2 lg:col-span-1">
          <label className="label">
            <span className="label-text">Spec Filter (key:value)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., socket:AM5, memory:16..."
            className="input input-bordered input-sm"
            value={inputSpecFilter}
            onChange={handleInputSpecFilterChange}
          />
        </div>
      </div>

      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <div className="text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} -
            {Math.min(pagination.page * pagination.limit, pagination.total)} of
            {" "}
            {pagination.total} products
          </div>
          <div className="join">
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              « Prev
            </button>
            <button className="join-item btn btn-xs">
              Page {pagination.page} of {pagination.totalPages}
            </button>
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next »
            </button>
          </div>
          <select
            className="select select-bordered select-xs w-24"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10/page</option>
            <option value={20}>20/page</option>
            <option value={50}>50/page</option>
            <option value={100}>100/page</option>
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>ID (Truncated)</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price (DZD)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0
              ? (
                products.map((product) => {
                  const priceInDZD = (product.price_cents / 100).toFixed(2);
                  let statusClass = "badge-ghost";
                  if (product.status === "active") {
                    statusClass = "badge-success";
                  } else if (product.status === "draft") {
                    statusClass = "badge-warning";
                  } else if (product.status === "discontinued") {
                    statusClass = "badge-error";
                  }

                  let stockClass = "badge-info";
                  if (product.stock_quantity === 0) stockClass = "badge-error";
                  else if (product.stock_quantity < 5) {
                    stockClass = "badge-warning";
                  } else if (
                    product.stock_quantity > 20
                  ) stockClass = "badge-success";

                  let firstImageUrl =
                    "https://placehold.co/60x60?text=No+Image  ";
                  if (
                    product.image_urls && Array.isArray(product.image_urls) &&
                    product.image_urls.length > 0
                  ) {
                    const imagePath = product.image_urls[0];
                    firstImageUrl = `${BACKEND_BASE_URL}${imagePath}`;
                  }

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="avatar">
                          <div className="mask mask-squircle w-12 h-12">
                            <img
                              src={firstImageUrl}
                              alt={`${product.name} thumbnail`}
                              onError={(e) => {
                                e.target.src =
                                  "https://placehold.co/60x60?text=Err  ";
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td title={product.id}>{truncateUuid(product.id)}</td>
                      <td>{product.name}</td>
                      <td>
                        {product.category_name || product.category_id || "N/A"}
                      </td>
                      <td>{priceInDZD}</td>
                      <td>
                        <span className={`badge ${stockClass}`}>
                          {product.stock_quantity}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass}`}>
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="btn btn-xs btn-info"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </Link>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending &&
                                deleteMutation.variables === product.id
                              ? (
                                <span className="loading loading-spinner loading-xs">
                                </span>
                              )
                              : <TrashIcon className="w-4 h-4" />}
                          </button>
                          <Link
                            to={`/admin/products/${product.id}`}
                            className="btn btn-xs btn-info mr-1"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )
              : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No products found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
          <div className="text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1} -
            {Math.min(pagination.page * pagination.limit, pagination.total)} of
            {" "}
            {pagination.total} products
          </div>
          <div className="join">
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              « Prev
            </button>
            <button className="join-item btn btn-xs">
              Page {pagination.page} of {pagination.totalPages}
            </button>
            <button
              className="join-item btn btn-xs"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next »
            </button>
          </div>
          <select
            className="select select-bordered select-xs w-24"
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10/page</option>
            <option value={20}>20/page</option>
            <option value={50}>50/page</option>
            <option value={100}>100/page</option>
          </select>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
