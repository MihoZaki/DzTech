// src/pages/orders/OrderDetails.jsx
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelOrder,
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
      const selectedData = response.data; // This is { order: { ... }, items: [...] }
      return selectedData; // Return the whole object
    },
    enabled: !!orderId,
  });

  // Destructure the order summary and items from the fetched data
  const { order: orderSummary, items: orderItems } = orderData || {}; // Use optional chaining in case orderData is initially undefined

  const updateStatusMutation = useMutation({
    // Adjust the mutation function if the API response structure for status update is also nested
    // mutationFn: ({ id, status }) => updateOrderStatus(id, { status }).then(res => res.data), // Example if update also returns { data: { order: {...}, items: [...] } }
    mutationFn: ({ id, status }) => updateOrderStatus(id, { status }), // Keep as is if update returns the plain response or a different structure
    onSuccess: (data) => { // 'data' here will be the response from updateOrderStatus
      // Invalidate and refetch the specific order and the list
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated successfully!");
      refetch(); // Refetch the order details after successful update
    },
    onError: (error) => {
      console.error("Update Status Error:", error);
      toast.error(
        `Failed to update status: ${error.message || "Unknown error"}`,
      );
    },
  });

  const cancelOrderMutation = useMutation({
    // Adjust the mutation function if the API response structure for cancel is also nested
    // mutationFn: cancelOrder.then(res => res.data), // Example if cancel also returns { data: { order: {...}, items: [...] } }
    mutationFn: cancelOrder, // Keep as is if cancel returns the plain response or a different structure
    onSuccess: (data, cancelledOrderId) => { // 'data' here will be the response from cancelOrder
      // Invalidate and refetch the specific order and the list
      queryClient.invalidateQueries({ queryKey: ["order", cancelledOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled successfully!");
      refetch(); // Refetch the order details after successful cancellation
    },
    onError: (error) => {
      console.error("Cancel Order Error:", error);
      toast.error(
        `Failed to cancel order: ${error.message || "Unknown error"}`,
      );
    },
  });

  // Handler for status update submission
  const handleStatusUpdate = (e) => {
    e.preventDefault();
    if (!newStatus || !orderSummary) return;

    console.log(
      `Attempting to update order ${orderId} to status: ${newStatus}`,
    );
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  // Handler for cancel order confirmation
  const handleCancelOrder = () => {
    if (!orderSummary) return;

    if (
      window.confirm(
        `Are you sure you want to cancel order ${orderSummary.id}?`,
      )
    ) {
      console.log(`Attempting to cancel order ${orderId}`);
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

  if (!orderSummary) { // Check for the existence of the order summary object
    return (
      <div className="alert alert-warning">
        Order not found.
        <Link to="/admin/orders" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  // Calculate totals using the orderItems array
  const subtotalCents = orderItems?.reduce(
    (sum, item) => sum + (item.price_cents * item.quantity),
    0,
  ) || 0;
  const discountTotalCents = orderSummary.discount_amount_cents || 0; // Adjust field name if different
  const deliveryCostCents = orderSummary.delivery_service?.base_cost_cents || 0; // Adjust field name if different
  const totalCents = subtotalCents - discountTotalCents + deliveryCostCents;

  // --- Determine valid status transitions based on backend rules ---
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
        return []; // No further transitions allowed
      default:
        return []; // For unknown statuses, allow none
    }
  };

  const validStatusOptions = getStatusOptions(orderSummary.status);

  // Determine if cancellation is allowed (based on backend rules - only from pending or confirmed)
  const canCancel = orderSummary.status === "pending" ||
    orderSummary.status === "confirmed";

  return (
    // ... (JSX remains mostly the same) ...
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <Link to="/admin/orders" className="btn btn-accent btn-outline mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Orders
      </Link>

      <div className="divider"></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Summary */}
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

          {/* Order Items Table */}
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
                          <td className="font-mono">
                            {truncateUuid(item.product_id)}
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
                          No items found for this order.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Totals, Actions, Shipping, Payment */}
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

          {/* Status Update & Actions */}
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
                {validStatusOptions.map((opt) => ( // Use filtered options
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}{" "}
                    {/* Capitalize */}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={!newStatus || updateStatusMutation.isPending} // Disable if no status selected or mutation pending
              >
                {updateStatusMutation.isPending
                  ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2">
                      </span>{" "}
                      Updating...
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

          {/* Delivery Service */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Delivery Service</h3>
            <p>
              <strong>ID:</strong>{" "}
              {truncateUuid(orderSummary.delivery_service_id)}
            </p>
          </div>

          {/* Payment Information (if available) */}
          <div className="bg-neutral p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-bold mb-4">Payment Information</h3>
            <p>
              <strong>Method:</strong> {orderSummary.payment_method || "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
