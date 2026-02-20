import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  fetchActiveDiscounts, // Import the new function
  fetchProductById,
  fetchProductDiscounts,
} from "../../services/api";

const ProductView = () => {
  const { id: productId } = useParams();

  // Fetch product details
  const {
    data: product,
    isLoading: productLoading,
    isError: productError,
    error: productFetchError,
  } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProductById(productId),
    select: (response) => response.data, // Adjust based on your API response structure
    enabled: !!productId,
  });

  // Fetch discounts linked to this product
  const {
    data: productDiscounts,
    isLoading: discountsLoading,
    isError: discountsError,
    error: discountsFetchError,
  } = useQuery({
    queryKey: ["productDiscounts", productId], // Unique query key
    queryFn: () => fetchProductDiscounts(productId),
    select: (response) => response.data,
    enabled: !!productId && !!product,
  });

  // Fetch active discounts
  const {
    data: allDiscounts, // Renamed for clarity, it now holds active discounts
    isLoading: allDiscountsLoading,
    isError: allDiscountsError,
    error: allDiscountsFetchError,
  } = useQuery({
    queryKey: ["activeDiscounts"], // Updated query key
    queryFn: fetchActiveDiscounts, // Use the new function
    select: (response) => response.data.data, // Adjust based on your API response structure for discounts
    // You might want to cache this globally if used elsewhere
  });

  const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
    "http://localhost:8080";

  // State for image gallery
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // State to manage the link discount modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedDiscountToLink, setSelectedDiscountToLink] = useState(""); // State for selected discount ID
  // State for the discount modal search term
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate prices and discounts
  const originalPriceInDZD = product
    ? (product.price_cents / 100).toFixed(2)
    : 0;
  const currentPriceInDZD = product
    ? (product.discounted_price_cents / 100).toFixed(2)
    : 0;
  const hasDiscount = product && product.has_active_discount;
  const discountPercentage =
    product && product.total_calculated_fixed_discount_cents > 0
      ? Math.trunc(product.effective_discount_percentage)
      : 0;

  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A"; // Handle invalid/missing IDs gracefully
    return `${uuid.substring(0, 8)}...`; // Take first 8 characters and append '...'
  };

  if (productLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (productError) {
    return (
      <div className="alert alert-error">
        Error loading product: {productFetchError.message}
        <Link to="/admin/products" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="alert alert-warning">
        Product not found.
        <Link to="/admin/products" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  const imageGalleryList = product.image_urls || [];
  const currentImageSrc = imageGalleryList[selectedImageIndex]
    ? `${BACKEND_BASE_URL}${imageGalleryList[selectedImageIndex]}`
    : "https://placehold.co/600x600?text=No+Image  ";

  // Determine loading/error state for discounts section
  const discountsSectionLoading = discountsLoading;
  const discountsSectionError = discountsError;

  // Function to handle opening the modal
  const handleOpenLinkModal = () => {
    setIsLinkModalOpen(true);
    // Optionally, fetch all discounts again if cache is stale or expired here
    // Or rely on the initial query which should ideally be cached globally
  };

  // Function to handle closing the modal
  const handleCloseLinkModal = () => {
    setIsLinkModalOpen(false);
    setSelectedDiscountToLink("");
    setSearchTerm(""); // Clear search term when closing modal
  };

  // Function to handle discount selection in the modal
  const handleDiscountSelect = (discountId) => {
    setSelectedDiscountToLink(discountId);
  };

  // Function to handle the link action (placeholder for now)
  const handleLinkDiscount = async () => {
    if (!selectedDiscountToLink) return; // Nothing selected

    console.log(
      "Attempting to link discount:",
      selectedDiscountToLink,
      "to product:",
      productId,
    );
    // TODO: Implement the actual API call to link the discount
    // Example: await linkProductDiscount(selectedDiscountToLink, productId);
    // TODO: Refetch product discounts after successful link
    // Example: refetchProductDiscounts(); // Assuming you have a refetch function from the query hook
    handleCloseLinkModal(); // Close modal after linking (or on success/error)
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-secondary-content rounded-lg min-h-screen">
      {/* Back Link */}
      <Link to="/admin/products" className="btn btn-accent btn-outline mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Products
      </Link>

      <div className="divider"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square mb-4 bg-base-100 rounded-lg p-4">
            <img
              src={currentImageSrc}
              alt={`${product.name} - Image ${selectedImageIndex + 1}`}
              className="w-full h-full object-contain rounded-lg"
              onError={(e) => {
                e.target.src =
                  "https://placehold.co/600x600?text=Image+Error  ";
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
            {imageGalleryList.map((imgPath, index) => {
              const fullThumbUrl = `${BACKEND_BASE_URL}${imgPath}`;
              return (
                <button
                  key={index}
                  className={`w-16 h-16 border rounded ${
                    selectedImageIndex === index
                      ? "border-primary ring-2 ring-primary"
                      : "border-transparent"
                  } bg-base-200 flex-shrink-0`}
                  onClick={() => setSelectedImageIndex(index)}
                  title={`View Image ${index + 1}`}
                >
                  <img
                    src={fullThumbUrl}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover rounded pointer-events-none"
                    onError={(e) => {
                      e.target.src = "https://placehold.co/100x100?text=Err  ";
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold text-primary">
              DA {currentPriceInDZD}
            </span>
            {hasDiscount && originalPriceInDZD !== currentPriceInDZD && (
              <>
                <span className="line-through text-gray-500">
                  DA {originalPriceInDZD}
                </span>
                <span className="badge badge-success bg-green-600 text-white">
                  -{product.effective_discount_percentage}%
                </span>
              </>
            )}
          </div>

          <p className="text-gray-600 mb-4">
            {product.description || product.short_description ||
              "No description available."}
          </p>

          <div className="mb-6">
            <table className="table bg-neutral">
              <tbody>
                <tr>
                  <td>Product ID</td>
                  <td className="font-mono">{product.id}</td>
                </tr>
                <tr>
                  <td>Slug</td>
                  <td className="font-mono">{product.slug}</td>
                </tr>
                <tr>
                  <td>Category</td>
                  <td>
                    {product.category_name || product.category_id || "N/A"}
                  </td>
                </tr>
                <tr>
                  <td>Brand</td>
                  <td>{product.brand}</td>
                </tr>
                <tr>
                  <td>Stock Quantity</td>
                  <td
                    className={product.stock_quantity > 0
                      ? "text-success"
                      : "text-error"}
                  >
                    {product.stock_quantity > 0
                      ? `${product.stock_quantity} In Stock`
                      : "Out of Stock"}
                  </td>
                </tr>
                <tr>
                  <td>Status</td>
                  <td>
                    <span
                      className={`badge ${
                        product.status === "active"
                          ? "badge-success"
                          : product.status === "draft"
                          ? "badge-warning"
                          : "badge-error"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Has Active Discount</td>
                  <td>
                    <span
                      className={`badge ${
                        product.has_active_discount
                          ? "badge-success"
                          : "badge-neutral"
                      }`}
                    >
                      {product.has_active_discount ? "Yes" : "No"}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Average Rating</td>
                  <td>
                    {product.avg_rating?.toFixed(2) || "N/A"}{" "}
                    ({product.num_ratings} reviews)
                  </td>
                </tr>
                <tr>
                  <td>Created At</td>
                  <td>{new Date(product.created_at).toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Updated At</td>
                  <td>{new Date(product.updated_at).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mb-6">
            <Link
              to={`/admin/products/${product.id}/edit`}
              className="btn btn-primary flex-1"
            >
              Edit Product
            </Link>
          </div>

          <div className="divider"></div>
          <h2 className="text-2xl content-center font-bold mb-4">
            Specifications
          </h2>
          <div className="bg-secondary-content p-4 rounded-box border border-base-200">
            <table className="table bg-neutral">
              <tbody>
                {product.spec_highlights &&
                    Object.keys(product.spec_highlights).length > 0
                  ? (
                    Object.entries(product.spec_highlights).map((
                      [key, value],
                    ) => (
                      <tr className="hover" key={key}>
                        <td className="font-semibold capitalize">
                          {key.replace(/_/g, " ")}
                        </td>
                        <td>{value}</td>
                      </tr>
                    ))
                  )
                  : (
                    <tr>
                      <td colSpan="2" className="italic text-center">
                        No specifications provided.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Discounts Applied Section */}
      <div className="mt-12">
        <div className="divider"></div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Applied Discounts</h2>
          <button
            className="btn btn-primary"
            onClick={handleOpenLinkModal}
          >
            Link Discount
          </button>
        </div>

        {discountsSectionLoading && (
          <div className="flex justify-center items-center h-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}

        {discountsSectionError && (
          <div className="alert alert-error">
            Error loading discounts: {discountsFetchError.message}
          </div>
        )}

        {!discountsSectionLoading && !discountsSectionError && (
          <>
            {productDiscounts && productDiscounts.length > 0
              ? (
                <div className="overflow-x-auto">
                  <table className="table  w-full bg-neutral">
                    <thead>
                      <tr>
                        <th>Discount ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Actions</th> {/* Future: Unlink button */}
                      </tr>
                    </thead>
                    <tbody>
                      {productDiscounts.map((discount) => (
                        <tr className="hover" key={discount.id}>
                          <td className="font-mono">
                            {truncateUuid(discount.id)}
                          </td>
                          <td>{discount.code}</td>
                          <td>{discount.discount_type}</td>
                          <td>{discount.discount_value}</td>
                          <td>
                            {discount.valid_from
                              ? new Date(discount.valid_from)
                                .toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td>
                            {discount.valid_until
                              ? new Date(discount.valid_until)
                                .toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                discount.is_active
                                  ? "badge-success"
                                  : "badge-neutral"
                              }`}
                            >
                              {discount.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {/* Placeholder for future unlink functionality */}
                            <button className="btn btn-xs btn-error" disabled>
                              Unlink
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
              : (
                <div className="alert alert-info">
                  <p>No discounts are currently applied to this product.</p>
                </div>
              )}
          </>
        )}
      </div>

      {/* Modal for Linking Discount */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-neutral p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Adjusted size and added scrolling */}
            <h3 className="text-lg font-bold mb-4">Link Discount to Product</h3>

            {allDiscountsLoading && (
              <div className="flex justify-center items-center h-24">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            )}

            {allDiscountsError && (
              <div className="alert alert-error">
                Error loading discounts: {allDiscountsFetchError.message}
              </div>
            )}

            {!allDiscountsLoading && !allDiscountsError && allDiscounts && (
              <div className="mb-4">
                <p className="label-text mb-2">Select an active discount:</p>
                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search discounts..."
                  className="input input-bordered w-full mb-4"
                  value={searchTerm} // State for search term
                  onChange={(e) => setSearchTerm(e.target.value)} // Update state on change
                />
                {/* Grid for discount cards - Filtered by search term */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2">
                  {allDiscounts
                    .filter((discount) => {
                      // Filter based on search term
                      if (!searchTerm) return true; // If no search term, show all
                      // Case-insensitive search in code, type, or value
                      return (
                        discount.code.toLowerCase().includes(
                          searchTerm.toLowerCase(),
                        ) ||
                        discount.discount_type.toLowerCase().includes(
                          searchTerm.toLowerCase(),
                        ) ||
                        discount.discount_value.toString().toLowerCase()
                          .includes(searchTerm.toLowerCase())
                        // Add more fields to search if needed
                      );
                    })
                    .map((discount) => {
                      // Calculate if this discount is already linked to prevent selection
                      const isAlreadyLinked = productDiscounts &&
                        productDiscounts.some((pd) => pd.id === discount.id);

                      return (
                        <div
                          key={discount.id}
                          className={`card bg-base-100 shadow-md border ${
                            selectedDiscountToLink === discount.id
                              ? "border-primary border-2" // Highlight selected card
                              : isAlreadyLinked
                              ? "border-gray-500 opacity-50" // Visually indicate already linked
                              : "border-base-300"
                          }`}
                          onClick={() => {
                            if (!isAlreadyLinked) { // Only allow selection if not already linked
                              handleDiscountSelect(discount.id);
                            }
                          }}
                          // Optional: Add a tooltip explaining why it's disabled if already linked
                          title={isAlreadyLinked
                            ? "This discount is already linked to this product."
                            : ""}
                        >
                          <div className="card-body p-4">
                            <h3 className="card-title text-lg">
                              {discount.code}
                            </h3>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="font-semibold">Type:</span>
                                {" "}
                                {discount.discount_type}
                              </p>
                              <p>
                                <span className="font-semibold">Value:</span>
                                {" "}
                                {discount.discount_value}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Valid From:
                                </span>{" "}
                                {discount.valid_from
                                  ? new Date(discount.valid_from)
                                    .toLocaleDateString()
                                  : "N/A"}
                              </p>
                              <p>
                                <span className="font-semibold">
                                  Valid Until:
                                </span>{" "}
                                {discount.valid_until
                                  ? new Date(discount.valid_until)
                                    .toLocaleDateString()
                                  : "N/A"}
                              </p>
                              {/* Adjust based on your discount schema */}
                            </div>
                            <div className="card-actions justify-end mt-2">
                              <span
                                className={`badge ${
                                  discount.is_active
                                    ? "badge-success"
                                    : "badge-neutral"
                                }`}
                              >
                                {discount.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn btn-error"
                onClick={handleCloseLinkModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleLinkDiscount}
                disabled={!selectedDiscountToLink} // Disable if nothing is selected
              >
                Link Discount
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductView;
