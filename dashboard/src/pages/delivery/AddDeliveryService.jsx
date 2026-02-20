// src/pages/delivery/AddDeliveryService.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDeliveryService } from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Define the Zod schema for validation
const addDeliveryServiceSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  base_cost_cents: z.number().int().min(0, {
    message: "Base cost must be zero or positive.",
  }),
  estimated_days: z.number().int().min(1, {
    message: "Estimated days must be at least 1.",
  }),
  is_active: z.boolean(), // Assuming this is a boolean in the form
});

const AddDeliveryService = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addDeliveryServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      base_cost_cents: 0,
      estimated_days: 1,
      is_active: true,
    },
  });

  const createDeliveryServiceMutation = useMutation({
    mutationFn: createDeliveryService,
    onSuccess: (data) => {
      // Invalidate and refetch the delivery services list to include the new one
      queryClient.invalidateQueries({ queryKey: ["deliveryServices"] });
      toast.success("Delivery Service created successfully!");
      navigate("/admin/delivery"); // Redirect back to the list
    },
    onError: (error) => {
      console.error("Create Error:", error);
      toast.error(
        `Failed to create delivery service: ${
          error.message || "Unknown error"
        }`,
      );
    },
  });

  const onSubmit = (data) => {
    console.log("Submitting Add Delivery Service Data:", data);
    // Convert base_cost_cents to integer if it's a string from input
    const submitData = {
      ...data,
      base_cost_cents: parseInt(data.base_cost_cents, 10),
      estimated_days: parseInt(data.estimated_days, 10),
    };
    createDeliveryServiceMutation.mutate(submitData);
  };

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-2xl mx-auto">
      <Link to="/admin/delivery" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Delivery Services
      </Link>

      <h2 className="text-xl font-bold mb-6">Add New Delivery Service</h2>

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
          />
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
          />
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
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createDeliveryServiceMutation.isPending}
          >
            {createDeliveryServiceMutation.isPending
              ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2">
                  </span>{" "}
                  Creating...
                </>
              )
              : "Create Service"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddDeliveryService;
