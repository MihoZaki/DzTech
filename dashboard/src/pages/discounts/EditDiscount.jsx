// src/pages/discounts/EditDiscount.jsx
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDiscountById, updateDiscount } from "../../services/api";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

// Define the Zod schema for validation based on DB/API schema
// Adjust regex for YYYY-MM-DDTHH:mm format (as provided by datetime-local)
const dateTimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const editDiscountSchema = z.object({
  code: z.string().min(1, { message: "Code is required." }),
  description: z.string().optional(),
  discount_type: z.enum(["percentage", "fixed"], {
    errorMap: () => ({ message: "Invalid discount type." }),
  }),
  discount_value: z.number().min(0, {
    message: "Discount value must be zero or positive.",
  }),
  valid_from: z.string().regex(dateTimeLocalRegex, {
    message: "Invalid date format for Valid From (expected YYYY-MM-DDTHH:mm).",
  }),
  valid_until: z.string().regex(dateTimeLocalRegex, {
    message: "Invalid date format for Valid Until (expected YYYY-MM-DDTHH:mm).",
  }),
  is_active: z.boolean(), // Add back is_active
});

const EditDiscount = () => {
  const { id: discountId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: discount,
    isLoading: discountLoading,
    isError: discountError,
    error: discountFetchError,
  } = useQuery({
    queryKey: ["discount", discountId],
    queryFn: () => fetchDiscountById(discountId),
    select: (response) => response.data, // Adjust based on your API response structure
    enabled: !!discountId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(editDiscountSchema),
    defaultValues: {
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: new Date().toISOString().slice(0, 16),
      is_active: true, // Default
    },
  });

  // Prefill form when data is loaded
  React.useEffect(() => {
    if (discount) {
      reset({
        code: discount.code,
        description: discount.description,
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        // Format fetched dates for datetime-local input (YYYY-MM-DDTHH:mm)
        valid_from: discount.valid_from
          ? new Date(discount.valid_from).toISOString().slice(0, 16)
          : "",
        valid_until: discount.valid_until
          ? new Date(discount.valid_until).toISOString().slice(0, 16)
          : "",
        is_active: discount.is_active, // Pre-fill is_active
      });
    }
  }, [discount, reset]);

  const updateDiscountMutation = useMutation({
    mutationFn: ({ id, data }) => updateDiscount(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["discount", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      toast.success("Discount updated successfully!");
      navigate("/admin/discounts"); // Redirect back to the list
    },
    onError: (error) => {
      console.error("Update Error:", error);
      toast.error(
        `Failed to update discount: ${error.message || "Unknown error"}`,
      );
    },
  });

  const onSubmit = (data) => {
    console.log("Raw Form Data from RHF:", data);
    const validFromDate = new Date(data.valid_from).toISOString();
    const validUntilDate = new Date(data.valid_until).toISOString();
    const submitData = {
      code: data.code.trim(),
      description: data.description?.trim() || null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      valid_from: validFromDate,
      valid_until: validUntilDate,
      is_active: data.is_active,
    };
    console.log("Processed Submit Data before API call:", submitData);
    console.log(
      "Type of submitData:",
      typeof submitData,
      Array.isArray(submitData),
    );

    updateDiscountMutation.mutate({ id: discountId, data: { ...submitData } });
  };
  if (discountLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (discountError) {
    return (
      <div className="alert alert-error">
        Error loading discount: {discountFetchError.message}
        <Link to="/admin/discounts" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  if (!discount) {
    return (
      <div className="alert alert-warning">
        Discount not found.
        <Link to="/admin/discounts" className="btn btn-sm ml-4">
          Go Back to List
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-4xl mx-auto">
      <Link to="/admin/discounts" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Discounts
      </Link>

      <h2 className="text-xl font-bold mb-6">Edit Discount: {discount.code}</h2>

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
              placeholder="Enter discount code..."
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
              step="0.01"
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
          <div className="flex gap-2">
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={updateDiscountMutation.isPending}
            >
              {updateDiscountMutation.isPending
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

export default EditDiscount;
