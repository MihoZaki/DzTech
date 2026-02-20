// src/pages/delivery/DeliveryServicesList.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDeliveryService,
  fetchDeliveryServices,
} from "../../services/api";
import {
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

const DeliveryServicesList = () => {
  const queryClient = useQueryClient();

  const {
    data: deliveryServices,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["deliveryServices"], // Keep the key the same for caching consistency
    queryFn: () => fetchDeliveryServices({ active_only: true }), // Pass the required parameter
    select: (response) => response.data, // Adjust based on your API response structure
  });
  console.log(deliveryServices);

  const deleteMutation = useMutation({
    mutationFn: deleteDeliveryService,
    onSuccess: (data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["deliveryServices"] });
      toast.success(`Delivery Service ID ${deletedId} deleted successfully.`);
    },
    onError: (error, deletedId) => {
      console.error("Delete Error:", error);
      toast.error(
        `Failed to delete delivery service ID ${deletedId}: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

  const handleDelete = (deliveryServiceId) => {
    if (
      window.confirm(
        `Are you sure you want to delete delivery service ID: ${deliveryServiceId}? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(deliveryServiceId);
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

  // Helper function to truncate UUID
  const truncateUuid = (uuid) => {
    if (!uuid || typeof uuid !== "string") return "N/A";
    return `${uuid.substring(0, 8)}...`;
  };

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Delivery Services</h2>
        <Link
          to="/admin/delivery/add"
          className="btn btn-accent flex items-center gap-2"
        >
          <PlusCircleIcon className="w-5 h-5" />
          Add Service
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID (Truncated)</th>
              <th>Name</th>
              <th>Description</th>
              <th>Base Cost (DZD)</th>
              <th>Est. Days</th>
              <th>Active</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveryServices && deliveryServices.length > 0
              ? (
                deliveryServices.map((service) => (
                  <tr key={service.id}>
                    <td title={service.id}>{truncateUuid(service.id)}</td>
                    <td>{service.name}</td>
                    <td>{service.description}</td>
                    <td>{(service.base_cost_cents / 100).toFixed(2)}</td>
                    <td>{service.estimated_days}</td>
                    <td>
                      <span
                        className={`badge ${
                          service.is_active ? "badge-success" : "badge-error"
                        }`}
                      >
                        {service.is_active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>{new Date(service.created_at).toLocaleString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/delivery/${service.id}/edit`}
                          className="btn btn-xs btn-info"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </Link>
                        <button
                          className="btn btn-xs btn-error"
                          onClick={() => handleDelete(service.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending &&
                              deleteMutation.variables === service.id
                            ? (
                              <span className="loading loading-spinner loading-xs">
                              </span>
                            )
                            : <TrashIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )
              : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No delivery services found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryServicesList;
