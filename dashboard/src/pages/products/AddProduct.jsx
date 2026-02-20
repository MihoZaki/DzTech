import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProduct, fetchCategories } from "../../services/api";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import FileUploadField from "../../components/FileUploadField";

// Define a schema for individual spec pairs
const specPairSchema = z.object({
  key: z.string().min(1, { message: "Key is required." }),
  value: z.string().min(1, { message: "Value is required." }),
});

// Modified main schema
const addProductSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().optional(),
  short_description: z.string().optional(),
  price_cents: z.number().int().positive({
    message: "Price (in cents) must be a positive integer.",
  }),
  stock_quantity: z.number().int().gte(0, {
    message: "Stock quantity cannot be negative.",
  }),
  status: z.enum(["active", "draft", "discontinued"], {
    message: "Status must be active, draft, or discontinued.",
  }),
  brand: z.string().min(1, { message: "Brand is required." }),
  category_id: z.uuid({
    message: "Category ID must be a valid UUID.",
  }),
  spec_highlights: z.array(specPairSchema).optional(),
  images: z.array(z.instanceof(File)).optional(),
});

const AddProduct = () => {
  const navigate = useNavigate();

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    select: (response) => response.data.data.data,
  });
  console.log(categories);

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (data) => {
      console.log("Product created successfully:", data.data);
      toast.success("Product created successfully!");
      navigate("/admin/products");
    },
    onError: (error) => {
      console.error("Create Product Error:", error);
      let errorMessage = "Failed to create product.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      status: "draft",
      spec_highlights: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "spec_highlights",
  });

  const onSubmit = async (data) => {
    const formData = new FormData();

    // Append all fields except spec_highlights
    Object.entries(data).forEach(([key, value]) => {
      if (key !== "spec_highlights") {
        formData.append(key, value);
      }
    });

    // Append spec_highlights as JSON
    if (data.spec_highlights && data.spec_highlights.length > 0) {
      const specHighlightsObj = data.spec_highlights.reduce((obj, pair) => {
        obj[pair.key] = pair.value;
        return obj;
      }, {});
      formData.append("spec_highlights", JSON.stringify(specHighlightsObj));
    }
    // Add this line right before the image appending loop
    console.log("Submitting images:", data.images);

    // Append images
    if (data.images && data.images.length > 0) {
      data.images.forEach((file) => {
        console.log("Appending file:", file); // Optional: log each file being appended
        formData.append("images", file, file.name);
      });
    } else {
      console.log("No images to append or data.images is falsy/empty"); // Optional: log if no images
    }

    // Debug
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

    // Submit
    createProductMutation.mutate(formData);
  };
  if (categoriesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (categoriesError) {
    return (
      <div className="alert alert-error">
        Error loading categories: {categoriesError.message}
      </div>
    );
  }

  return (
    <div className="bg-neutral p-6 rounded-lg shadow-md max-w-4xl mx-auto border border-secondary">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold ml-2">Add New Product</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.name ? "input-error" : ""
            }`}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-red-500 text-xs">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Description</span>
          </label>
          <textarea
            className={`textarea textarea-bordered ${
              errors.description ? "textarea-error" : ""
            }`}
            rows="3"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-red-500 text-xs">{errors.description.message}</p>
          )}
        </div>

        {/* Short Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Short Description</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.short_description ? "input-error" : ""
            }`}
            {...register("short_description")}
          />
          {errors.short_description && (
            <p className="text-red-500 text-xs">
              {errors.short_description.message}
            </p>
          )}
        </div>

        {/* Price (in cents) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Price (in cents) *</span>
          </label>
          <input
            type="number"
            min="0"
            className={`input input-bordered ${
              errors.price_cents ? "input-error" : ""
            }`}
            {...register("price_cents", { valueAsNumber: true })}
          />
          {errors.price_cents && (
            <p className="text-red-500 text-xs">{errors.price_cents.message}</p>
          )}
        </div>

        {/* Category ID */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Category *</span>
          </label>
          <select
            className={`select select-bordered ${
              errors.category_id ? "select-error" : ""
            }`}
            {...register("category_id")}
          >
            <option value="">Select a category...</option>
            {Array.isArray(categories) &&
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          {errors.category_id && (
            <p className="text-red-500 text-xs">{errors.category_id.message}</p>
          )}
        </div>

        {/* Stock Quantity */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Stock Quantity *</span>
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            className={`input input-bordered ${
              errors.stock_quantity ? "input-error" : ""
            }`}
            {...register("stock_quantity", { valueAsNumber: true })}
          />
          {errors.stock_quantity && (
            <p className="text-red-500 text-xs">
              {errors.stock_quantity.message}
            </p>
          )}
        </div>

        {/* Status */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Status *</span>
          </label>
          <select
            className={`select select-bordered ${
              errors.status ? "select-error" : ""
            }`}
            {...register("status")}
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="discontinued">Discontinued</option>
          </select>
          {errors.status && (
            <p className="text-red-500 text-xs">{errors.status.message}</p>
          )}
        </div>

        {/* Brand */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Brand *</span>
          </label>
          <input
            type="text"
            className={`input input-bordered ${
              errors.brand ? "input-error" : ""
            }`}
            {...register("brand")}
          />
          {errors.brand && (
            <p className="text-red-500 text-xs">{errors.brand.message}</p>
          )}
        </div>

        {/* Spec Highlights (Dynamic Form) */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Specification Highlights</span>
          </label>
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-xs btn-outline btn-secondary mb-2"
              onClick={() => append({ key: "", value: "" })}
            >
              <PlusIcon className="w-4 h-4 mr-1" /> Add Spec
            </button>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Key (e.g., Processor)"
                  className={`input input-bordered input-sm flex-1 ${
                    errors.spec_highlights?.[index]?.key ? "input-error" : ""
                  }`}
                  {...register(`spec_highlights.${index}.key`)}
                />
                <input
                  type="text"
                  placeholder="Value (e.g., Intel i7)"
                  className={`input input-bordered input-sm flex-1 ${
                    errors.spec_highlights?.[index]?.value ? "input-error" : ""
                  }`}
                  {...register(`spec_highlights.${index}.value`)}
                />
                <button
                  type="button"
                  className="btn btn-xs btn-outline btn-error"
                  onClick={() =>
                    remove(index)}
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            {errors.spec_highlights && (
              <p className="text-red-500 text-xs">
                At least one spec is required and keys/values cannot be blank.
              </p>
            )}
          </div>
        </div>

        {/* Image Files */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Images * (Multiple allowed)</span>
          </label>
          <FileUploadField
            name="images"
            control={control}
            rules={{
              required: "At least one image file is required.",
              validate: (value) => {
                if (!value || value.length === 0) {
                  return "At least one image file is required.";
                }
                return true;
              },
            }}
            accept="image/*"
            multiple={true}
          />
        </div>

        {/* Submit Button */}
        <div className="form-control mt-6">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending
              ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2">
                  </span>
                  Creating...
                </>
              )
              : (
                "Create Product"
              )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;
