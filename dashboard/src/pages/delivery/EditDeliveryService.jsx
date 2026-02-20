// src/pages/delivery/EditDeliveryService.jsx
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDeliveryServiceById,
  updateDeliveryService,
} from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
// Define the Zod schema for validation (similar to add, can be reused or extended)
const editDeliveryServiceSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  base_cost_cents: z.number().int().min(0, {
    message: "Base cost must be zero or positive.",
  }),
  estimated_days: z.number().int().min(1, {
    message: "Estimated days must be at least 1.",
  }),
  is_active: z.boolean(),
});

const EditDeliveryService = () => {
  const { id: deliveryServiceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: deliveryService,
    isLoading: serviceLoading,
    isError: serviceError,
    error: serviceFetchError,
  } = useQuery({
    queryKey: ["deliveryService", deliveryServiceId],
    queryFn: () => fetchDeliveryServiceById(deliveryServiceId),
    select: (response) => response.data, // Adjust based on your API response structure (should be the service object itself)
    enabled: !!deliveryServiceId, // Only run query if deliveryServiceId is available
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset, // Use reset to populate form with fetched data
  } = useForm({
    resolver: zodResolver(editDeliveryServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      base_cost_cents: 0,
      estimated_days: 1,
      is_active: true,
    },
  });

  // Prefill form when data is loaded
  React.useEffect(() => {
    if (deliveryService) {
      reset({
        name: deliveryService.name,
        description: deliveryService.description,
        base_cost_cents: deliveryService.base_cost_cents,
        estimated_days: deliveryService.estimated_days,
        is_active: deliveryService.is_active,
      });
    }
  }, [deliveryService, reset]);

  const updateDeliveryServiceMutation = useMutation({
    mutationFn: ({ id, data }) => updateDeliveryService(id, data), // Adjust mutation function signature
    onSuccess: (data, variables) => { // Use variables to get the ID
      // Invalidate and refetch the specific service and the list
      queryClient.invalidateQueries({
        queryKey: ["deliveryService", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["deliveryServices"] });
      toast.success("Delivery Service updated successfully!");
      navigate("/admin/delivery"); // Redirect back to the list
    },
    onError: (error) => {
      console.error("Update Error:", error);
      toast.error(
        `Failed to update delivery service: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

  const onSubmit = (data) => {
    console.log("Submitting Edit Delivery Service Data:", data);
    // Convert base_cost_cents and estimated_days to integers if they are strings from input
    const submitData = {
      ...data,
      base_cost_cents: parseInt(data.base_cost_cents, 10),
      estimated_days: parseInt(data.estimated_days, 10),
    };
    updateDeliveryServiceMutation.mutate({
      id: deliveryServiceId,
      data: submitData,
    }); // Pass id and data object
  };

  if (serviceLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (serviceError) {
    return (
      <div className="alert alert-error">
        Error loading delivery service: {serviceFetchError.message}
        <Link to="/admin/delivery" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  if (!deliveryService) {
    return (
      <div className="alert alert-warning">
        Delivery Service not found.
        <Link to="/admin/delivery" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <Link to="/admin/delivery" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Delivery Services
      </Link>

      <h2 className="text-xl font-bold mb-6">
        Edit Delivery Service: {deliveryService.name}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.name ? "input-error" : ""
            }`}
            placeholder="Enter service name..."
            {...register("name")}
          />
          {errors.name && (
            <label className="label">
              <span className="label-text-alt text-error">
                {errors.name.message}
              </span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Description *</span>
          </label>
          <textarea
            className={`textarea textarea-bordered ${
              errors.description ? "textarea-error" : ""
            }`}
            placeholder="Enter service description..."
            rows="3"
            {...register("description")}
          >
          </textarea>
          {errors.description && (
            <label className="label">
              <span className="label-text-alt text-error">
                {errors.description.message}
              </span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Base Cost (cents) *</span>
          </label>
          <input
            type="number"
            min="0"
            className={`input input-bordered ${
              errors.base_cost_cents ? "input-error" : ""
            }`}
            placeholder="Enter cost in cents (e.g., 1500 for 15.00 DZD)..."
            {...register("base_cost_cents", { valueAsNumber: true })}
          />{" "}
          {errors.base_cost_cents && (
            <label className="label">
              <span className="label-text-alt text-error">
                {errors.base_cost_cents.message}
              </span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Estimated Days *</span>
          </label>
          <input
            type="number"
            min="1"
            className={`input input-bordered ${
              errors.estimated_days ? "input-error" : ""
            }`}
            placeholder="Enter estimated delivery days..."
            {...register("estimated_days", { valueAsNumber: true })}
          />{" "}
          {errors.estimated_days && (
            <label className="label">
              <span className="label-text-alt text-error">
                {errors.estimated_days.message}
              </span>
            </label>
          )}
        </div>

        <div className="form-control">
          <label className="label cursor-pointer justify-between">
            <span className="label-text">Active *</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              {...register("is_active")}
            />
          </label>
        </div>

        <div className="form-control mt-6">
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={updateDeliveryServiceMutation.isPending}
            >
              {updateDeliveryServiceMutation.isPending
                ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2">
                    </span>{" "}
                    Saving...
                  </>
                )
                : "Save Changes"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(-1)} // Go back
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditDeliveryService;
