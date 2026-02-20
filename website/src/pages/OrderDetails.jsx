import React from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderById } from "../services/api"; // Import the API function
import { toast } from "sonner"; // Import toast for error messages

// Base URL for the backend API (adjust this for your deployment environment)
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ||
  "http://localhost:8080";

const OrderDetails = () => {
  const { orderId } = useParams(); // Get the order ID from the URL

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };
  // Function to construct full image URL
  const constructImageUrl = (imageUrl) => {
    if (!imageUrl) return "";

    // If it's already a full URL, return as is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // Otherwise, prepend the backend base URL
    return `${BACKEND_BASE_URL}${imageUrl}`;
  };

  // Use TanStack Query to fetch order details
  const {
    data, // Changed from 'order' to 'data' to match TanStack Query convention
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: () => fetchOrderById(orderId),
    enabled: !!orderId, // Only run query if orderId exists
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Cache for 10 minutes
    onError: (err) => {
      console.error(`Error fetching order with id ${orderId}:`, err);
      toast.error("Failed to load order details. Please try again later.");
    },
  });

  // Extract the order and items from the API response structure
  const order = data?.order; // Use data.order as per your API response structure
  const items = data?.items; // Use data.items as per your API response structure

  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format currency helper function
  const formatCurrency = (cents) => {
    if (!cents) return "DZD 0.00";
    return `DZD ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Order Details</h1>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center min-h-[200px]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="alert alert-error">
          <p>
            {error.message ||
              "Failed to load order details. Please try again later."}
          </p>
          <button
            onClick={() => refetch()}
            className="btn btn-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Order Details */}
      {!isLoading && !isError && order && (
        <>
          {/* Back Button */}
          <div className="mb-6">
            <Link to="/account/orders" className="btn btn-sm btn-ghost">
              &larr; Back to Orders
            </Link>
          </div>

          {/* Order Summary Card */}
          <div className="card bg-base-100 shadow-lg border border-secondary-content mb-6">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Order #{order.id}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`badge ${
                        order.status.toLowerCase() === "delivered" ||
                          order.status.toLowerCase() === "completed"
                          ? "badge-success"
                          : order.status.toLowerCase() === "shipped"
                          ? "badge-info"
                          : order.status.toLowerCase() === "processing"
                          ? "badge-warning"
                          : "badge-neutral" // Default for other statuses
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                  </p>
                  <p>
                    <strong>Date:</strong> {formatDate(order.created_at)}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Total Amount:</strong>{" "}
                    {formatCurrency(order.total_amount_cents)}
                  </p>
                  <p>
                    <strong>Payment Method:</strong> {order.payment_method}
                  </p>
                  <p>
                    <strong>Phone:</strong> {order.phone_number_1 || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Items List Card */}
          <div className="card bg-base-100 shadow-lg border border-secondary-content mb-6">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">Items Ordered</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="font-bold">Item</th>
                      <th className="font-bold">product ID</th>
                      <th className="font-bold">Price</th>
                      <th className="font-bold">Quantity</th>
                      <th className="font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items && items.length > 0
                      ? (
                        items.map((orderItem) => {
                          return (
                            <tr key={orderItem.id}>
                              <td>
                                <div className="flex items-center gap-4">
                                  <div>
                                    <p className="font-semibold">
                                      {orderItem.product_name}
                                    </p>
                                    {/* Brand is likely not available in this structure */}
                                    {/* <p className="text-sm text-gray-500">{item.brand}</p> */}
                                  </div>
                                </div>
                              </td>
                              <td>{truncateUuid(orderItem.product_id)}</td>
                              <td>{formatCurrency(orderItem.price_cents)}</td>
                              <td>{orderItem.quantity}</td>
                              <td>
                                {formatCurrency(
                                  orderItem.subtotal_cents, // Use subtotal_cents from the order item
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )
                      : (
                        <tr>
                          <td colSpan="4" className="text-center">
                            No items found for this order.
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Addresses Card */}
          <div className="card bg-base-100 shadow-lg border border-secondary-content">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">Delivery Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold mb-2">Delivery Address</h4>
                  <p>
                    <strong>Full Name:</strong> {order.user_full_name}
                  </p>
                  <p>
                    <strong>Province:</strong> {order.province}
                  </p>
                  <p>
                    <strong>City:</strong> {order.city}
                  </p>
                  <p>
                    <strong>Notes:</strong> {order.notes || "N/A"}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Contact Information</h4>
                  <p>
                    <strong>Phone 1:</strong> {order.phone_number_1 || "N/A"}
                  </p>
                  <p>
                    <strong>Phone 2:</strong> {order.phone_number_2 || "N/A"}
                  </p>
                  <p>
                    <strong>Delivery Service ID:</strong>{" "}
                    {order.delivery_service_id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Order Not Found State (if API returns null) */}
      {!isLoading && !isError && !order && (
        <div className="text-center py-12">
          <p className="text-xl text-error mb-4">Order not found.</p>
          <Link to="/account/orders" className="btn btn-primary">
            Go to My Orders
          </Link>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
