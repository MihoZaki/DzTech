// src/pages/orders/OrderDetails.jsx
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelOrder,
  fetchDeliveryServiceById, // 1. Import the new function
  fetchOrderById,
  updateOrderStatus,
} from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

const OrderDetails = () => {
  const { id: orderId } = useParams();
  const queryClient = useQueryClient();

  // State for status update dropdown
  const [newStatus, setNewStatus] = useState("");

  // --- Query 1: Fetch Order Details ---
  const {
    data: orderData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const response = await fetchOrderById(orderId);
      return response;
    },
    select: (response) => {
      const selectedData = response.data;
      return selectedData;
    },
    enabled: !!orderId,
  });

  const { order: orderSummary, items: orderItems } = orderData || {};
  const deliveryServiceId = orderSummary?.delivery_service_id;

  // --- Query 2: Fetch Delivery Service Details ---
  // This only runs when we have a valid deliveryServiceId from the first query
  const {
    data: deliveryServiceData,
    isLoading: isDeliveryLoading,
    isError: isDeliveryError,
  } = useQuery({
    queryKey: ["delivery-service", deliveryServiceId],
    queryFn: async () => {
      const response = await fetchDeliveryServiceById(deliveryServiceId);
      return response;
    },
    select: (response) => {
      // Adjust this based on your actual API response structure for delivery services
      // e.g., if response is { data: { service: { ... } } } or { data: { ... } }
      return response.data || response;
    },
    enabled: !!deliveryServiceId && deliveryServiceId !== "N/A",
    staleTime: 10 * 60 * 1000, // Cache for 10 mins as service details rarely change
  });

  // Helper to safely get service name
  const getServiceName = () => {
    if (isDeliveryLoading) return "Loading...";
    if (isDeliveryError) return "Failed to load service";
    if (!deliveryServiceData) return "Unknown Service";

    // Adjust property access based on your API response (e.g., .name, .service_name, .provider)
    return deliveryServiceData.name || deliveryServiceData.provider ||
      "Unnamed Service";
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated successfully!");
      refetch();
    },
    onError: (error) => {
      console.error("Update Status Error:", error);
      toast.error(
        `Failed to update status: ${error.message || "Unknown error"}`,
      );
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: (_, cancelledOrderId) => {
      queryClient.invalidateQueries({ queryKey: ["order", cancelledOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled successfully!");
      refetch();
    },
    onError: (error) => {
      console.error("Cancel Order Error:", error);
      toast.error(
        `Failed to cancel order: ${error.message || "Unknown error"}`,
      );
    },
  });

  const handleStatusUpdate = (e) => {
    e.preventDefault();
    if (!newStatus || !orderSummary) return;
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  const handleCancelOrder = () => {
    if (!orderSummary) return;
    if (
      window.confirm(
        `Are you sure you want to cancel order ${orderSummary.id}?`,
      )
    ) {
      cancelOrderMutation.mutate(orderId);
    }
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
      <div className="alert alert-error">
        Error loading order: {error.message}
        <Link to="/admin/orders" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  if (!orderSummary) {
    return (
      <div className="alert alert-warning">
        Order not found.
        <Link to="/admin/orders" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  const subtotalCents = orderItems?.reduce(
    (sum, item) => sum + (item.price_cents * item.quantity),
    0,
  ) || 0;
  const discountTotalCents = orderSummary.discount_amount_cents || 0;
  // If the order summary doesn't have delivery cost, we might get it from the service details later
  const deliveryCostCents = orderSummary.delivery_cost_cents ||
    deliveryServiceData?.base_cost_cents || 0;
  const totalCents = orderSummary.total_amount_cents;

  const getStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case "pending":
        return ["confirmed", "cancelled"];
      case "confirmed":
        return ["shipped", "cancelled"];
      case "shipped":
        return ["delivered"];
      case "delivered":
      case "cancelled":
        return [];
      default:
        return [];
    }
  };

  const validStatusOptions = getStatusOptions(orderSummary.status);
  const canCancel = orderSummary.status === "pending" ||
    orderSummary.status === "confirmed";

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <Link to="/admin/orders" className="btn btn-accent btn-outline mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Orders
      </Link>

      <div className="divider"></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Summary & Items */}
        <div className="lg:col-span-2">
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">
              Order #{truncateUuid(orderSummary.id)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`badge ${
                      orderSummary.status === "pending"
                        ? "badge-warning"
                        : orderSummary.status === "confirmed"
                        ? "badge-info"
                        : orderSummary.status === "shipped"
                        ? "badge-primary"
                        : orderSummary.status === "delivered"
                        ? "badge-success"
                        : "badge-error"
                    }`}
                  >
                    {orderSummary.status}
                  </span>
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(orderSummary.created_at).toLocaleString()}
                </p>
                {orderSummary.cancelled_at && (
                  <p>
                    <strong>Cancelled At:</strong>{" "}
                    {new Date(orderSummary.cancelled_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <p>
                  <strong>User:</strong> {orderSummary.user_full_name || "N/A"}
                </p>
                <p>
                  <strong>User ID:</strong> {truncateUuid(orderSummary.user_id)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU/ID</th>
                    <th>Price (DZD)</th>
                    <th>Quantity</th>
                    <th>Total (DZD)</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems && orderItems.length > 0
                    ? (
                      orderItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td title={item.product_id}>
                            {/* Wrap the truncated ID in a Link */}
                            <Link
                              to={`/admin/products/${item.product_id}`} // Navigate to product detail page
                              className="link link-hover link-primary" // Add styling for links
                            >
                              {truncateUuid(item.product_id)}
                            </Link>
                          </td>
                          <td>{(item.price_cents / 100).toFixed(2)}</td>
                          <td>{item.quantity}</td>
                          <td>
                            {((item.price_cents * item.quantity) / 100).toFixed(
                              2,
                            )}
                          </td>
                        </tr>
                      ))
                    )
                    : (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          No items found.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Totals, Actions, Shipping, Delivery Service */}
        <div>
          {/* Order Totals */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Totals</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{(subtotalCents / 100).toFixed(2)}</span>
              </div>
              {discountTotalCents > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{(discountTotalCents / 100).toFixed(2)}</span>
                </div>
              )}
              {deliveryCostCents > 0 && (
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span>{(deliveryCostCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="divider"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{(totalCents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status Update */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Update Status</h3>
            <form onSubmit={handleStatusUpdate} className="space-y-2">
              <select
                className="select select-bordered w-full"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={updateStatusMutation.isPending}
              >
                <option value="">Select new status...</option>
                {validStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={!newStatus || updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending
                  ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2">
                      </span>Updating...
                    </>
                  )
                  : "Update Status"}
              </button>
            </form>
          </div>

          {/* Shipping Address */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Shipping Address</h3>
            <p>{orderSummary.address_line_1}</p>
            {orderSummary.address_line_2 && <p>{orderSummary.address_line_2}
            </p>}
            <p>
              {orderSummary.city}, {orderSummary.province}{" "}
              {orderSummary.postal_code}
            </p>
            <p>{orderSummary.country}</p>
          </div>

          {/* 2. Updated Delivery Service Card */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Delivery Service</h3>

            {isDeliveryLoading
              ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="loading loading-spinner loading-xs"></span>
                  Loading service details...
                </div>
              )
              : isDeliveryError
              ? (
                <div className="text-error text-sm">
                  Could not load service details.
                  <br />
                  <span className="opacity-70">
                    ID: {truncateUuid(deliveryServiceId)}
                  </span>
                </div>
              )
              : (
                <div className="space-y-2">
                  <p>
                    <strong>Provider:</strong>{" "}
                    <span className="text-primary font-semibold">
                      {getServiceName()}
                    </span>
                  </p>

                  {/* Display extra details if your API returns them */}
                  {deliveryServiceData?.phone && (
                    <p>
                      <strong>Contact:</strong> {deliveryServiceData.phone}
                    </p>
                  )}
                  {deliveryServiceData?.tracking_url && (
                    <p>
                      <strong>Tracking:</strong>{" "}
                      <a
                        href={deliveryServiceData.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary link-hover"
                      >
                        View Tracking
                      </a>
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    Service ID: {truncateUuid(deliveryServiceId)}
                  </p>
                </div>
              )}
          </div>

          {/* Payment Information */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Payment Information</h3>
            <p>
              <strong>Method:</strong> {orderSummary.payment_method || "N/A"}
            </p>
          </div>

          {/* Cancel Button (Conditional) */}
          {canCancel && (
            <button
              onClick={handleCancelOrder}
              className="btn btn-error btn-outline w-full"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
