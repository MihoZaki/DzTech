// src/pages/discounts/AddDiscount.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDiscount } from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Define the Zod schema for validation based on DB/API schema
// Adjust regex for YYYY-MM-DDTHH:mm format (as provided by datetime-local)
const dateTimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const addDiscountSchema = z.object({
  code: z.string().min(1, { message: "Code is required." }),
  description: z.string().optional(), // Optional
  discount_type: z.enum(["percentage", "fixed"], { // Use 'fixed' as per DB schema
    errorMap: () => ({ message: "Invalid discount type." }),
  }),
  discount_value: z.number().min(0, {
    message: "Discount value must be zero or positive.",
  }), // Use number
  valid_from: z.string().regex(dateTimeLocalRegex, {
    message: "Invalid date format for Valid From (expected YYYY-MM-DDTHH:mm).",
  }),
  valid_until: z.string().regex(dateTimeLocalRegex, {
    message: "Invalid date format for Valid Until (expected YYYY-MM-DDTHH:mm).",
  }),
  is_active: z.boolean(), // Add back is_active
  // Removed: name, target_type, target_id, min_order_value_cents, max_uses (assuming not part of direct API call for create/update)
});

const AddDiscount = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(addDiscountSchema),
    defaultValues: {
      code: "",
      description: "",
      discount_type: "percentage", // Default type
      discount_value: 0, // Default value
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        .slice(0, 16),
      is_active: true, // Default to active
    },
  });

  const createDiscountMutation = useMutation({
    mutationFn: createDiscount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Discount created successfully!");
      navigate("/admin/discounts"); // Redirect back to the list
    },
    onError: (error) => {
      console.error("Create Error:", error);
      toast.error(
        `Failed to create discount: ${error.message || "Unknown error"}`,
      );
    },
  });

  const onSubmit = (data) => {
    console.log("Submitting Add Discount Data:", data);

    const validFromDate = new Date(data.valid_from).toISOString();
    const validUntilDate = new Date(data.valid_until).toISOString();
    // Prepare data for API call
    // discount_value is already a number if parsed correctly by react-hook-form
    // valid_from and valid_until are already strings in ISO format
    const submitData = {
      code: data.code.trim(), // Ensure no leading/trailing spaces
      description: data.description?.trim() || null, // Send null if empty string
      discount_type: data.discount_type,
      discount_value: data.discount_value, // Should be a number
      valid_from: validFromDate,
      valid_until: validUntilDate,
      is_active: data.is_active, // Include is_active
      // Do not include name, target_type, target_id, min_order_value_cents, max_uses
    };
    createDiscountMutation.mutate(submitData);
  };

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <Link to="/admin/discounts" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Discounts
      </Link>

      <h2 className="text-xl font-bold mb-6">Add New Discount</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Code *</span>
            </label>
            <input
              type="text"
              className={`input input-bordered ${
                errors.code ? "input-error" : ""
              }`}
              placeholder="Enter discount code (e.g., SAVE10)..."
              {...register("code")}
            />
            {errors.code && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.code.message}
                </span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className={`textarea textarea-bordered ${
                errors.description ? "textarea-error" : ""
              }`}
              placeholder="Enter discount description..."
              rows="2"
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
              <span className="label-text">Discount Type *</span>
            </label>
            <select
              className={`select select-bordered ${
                errors.discount_type ? "select-error" : ""
              }`}
              {...register("discount_type")}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
            {errors.discount_type && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.discount_type.message}
                </span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Discount Value *</span>
            </label>
            <input
              type="number"
              step="0.01" // Allow decimal values for percentages or fixed amounts in cents
              min="0"
              className={`input input-bordered ${
                errors.discount_value ? "input-error" : ""
              }`}
              placeholder="Enter discount value..."
              {...register("discount_value", { valueAsNumber: true })}
            />
            {errors.discount_value && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.discount_value.message}
                </span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Valid From *</span>
            </label>
            <input
              type="datetime-local"
              className={`input input-bordered ${
                errors.valid_from ? "input-error" : ""
              }`}
              {...register("valid_from")}
            />
            {errors.valid_from && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.valid_from.message}
                </span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Valid Until *</span>
            </label>
            <input
              type="datetime-local"
              className={`input input-bordered ${
                errors.valid_until ? "input-error" : ""
              }`}
              {...register("valid_until")}
            />
            {errors.valid_until && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {errors.valid_until.message}
                </span>
              </label>
            )}
          </div>

          {/* Add is_active toggle */}
          <div className="form-control md:col-span-2">
            <label className="label cursor-pointer justify-between">
              <span className="label-text">Active *</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                {...register("is_active")}
              />
            </label>
          </div>
        </div>

        <div className="form-control mt-6">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createDiscountMutation.isPending}
          >
            {createDiscountMutation.isPending
              ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2">
                  </span>{" "}
                  Creating...
                </>
              )
              : "Create Discount"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddDiscount;
