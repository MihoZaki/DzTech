import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext"; // Import useAuth to check authentication status
import {
  createOrder,
  fetchDeliveryOptions,
  placeGuestOrder,
} from "../services/api"; // Import the API functions
import { toast } from "sonner"; // Import toast for notifications

const Checkout = () => {
  const { cart, subtotal, clearCart } = useCart(); // Get cart data and clearCart function
  const { user, isAuthenticated } = useAuth(); // Get user and authentication status
  const navigate = useNavigate();

  // State for form inputs
  const [formData, setFormData] = useState({
    // Shipping Address
    firstName: "",
    lastName: "",
    phone: "",
    wilaya: "", // Separate Wilaya (Province)
    city: "", // Separate City
    streetAddress: "", // Street Address

    // Other Checkout Details
    deliveryServiceId: "", // Maps to API's delivery_service_id
    paymentMethod: "Cash on Delivery", // Default payment method
    notes: "", // Maps to API's notes field
  });

  const [errors, setErrors] = useState({}); // State to store validation errors
  const [loading, setLoading] = useState(false); // State for loading during API call
  const [apiError, setApiError] = useState(""); // State for API errors
  const [deliveryOptions, setDeliveryOptions] = useState([]); // State to hold fetched delivery options
  const [deliveryOptionsLoading, setDeliveryOptionsLoading] = useState(true); // Loading state for delivery options
  const [deliveryOptionsError, setDeliveryOptionsError] = useState(""); // Error state for delivery options

  // Fetch delivery options when component mounts
  useEffect(() => {
    const loadDeliveryOptions = async () => {
      setDeliveryOptionsLoading(true);
      setDeliveryOptionsError("");
      try {
        const options = await fetchDeliveryOptions();
        setDeliveryOptions(options);
        // Optionally, set a default delivery option if available
        // if (options.length > 0) {
        //   setFormData(prev => ({...prev, deliveryServiceId: options[0].id}));
        // }
      } catch (err) {
        console.error("Error fetching delivery options:", err);
        setDeliveryOptionsError(
          "Failed to load delivery options. Please try again later.",
        );
        toast.error("Failed to load delivery options.");
      } finally {
        setDeliveryOptionsLoading(false);
      }
    };

    loadDeliveryOptions();
  }, []); // Empty dependency array means this runs once on mount

  // Calculate total including delivery cost
  const selectedDeliveryOption = deliveryOptions.find((option) =>
    option.id === formData.deliveryServiceId
  );
  const deliveryCostCents = selectedDeliveryOption
    ? selectedDeliveryOption.base_cost_cents
    : 0;
  const deliveryCostDZD = deliveryCostCents / 100; // Convert cents to DZD
  const totalCents = subtotal * 100 + deliveryCostCents; // Calculate total in cents
  const totalDZD = totalCents / 100; // Convert total cents to DZD

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Clear general API error when user starts editing
    if (apiError) {
      setApiError("");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!/^\+?[0-9\s\-\(\)]+$/.test(formData.phone)) { // Basic phone format validation
      newErrors.phone = "Please enter a valid phone number.";
    }
    if (!formData.wilaya.trim()) {
      newErrors.wilaya = "Wilaya is required.";
    }
    if (!formData.city.trim()) {
      newErrors.city = "City is required.";
    }
    if (!formData.deliveryServiceId.trim()) {
      newErrors.deliveryServiceId = "Delivery service is required.";
    }
    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = "Street address is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return; // Stop if client-side validation fails
    }

    setLoading(true); // Set loading state
    setApiError(""); // Clear any previous API errors

    try {
      // Prepare the payload object according to the API specification
      const payload = {
        shipping_address: {
          full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          phone_number_1: formData.phone.trim(),
          phone_number_2: "", // Optional, could add a second phone field later
          province: formData.wilaya.trim(),
          city: formData.city.trim(),
          address: formData.streetAddress.trim(), // Use the separate address field
        },
        delivery_service_id: formData.deliveryServiceId.trim(), // Use the selected ID
        payment_method: formData.paymentMethod, // Use the selected/default method
        notes: formData.notes.trim(), // Use the notes field
      };

      console.log("Sending checkout payload:", payload); // Debugging

      let response;
      if (isAuthenticated) {
        // Call the authenticated checkout API function
        response = await createOrder(payload);
        console.log("Authenticated order placed successfully:", response); // Debugging
      } else {
        // Call the guest checkout API function
        response = await placeGuestOrder(payload);
        console.log("Guest order placed successfully:", response); // Debugging
      }

      toast.success(`Order ${response.order.id} placed successfully!`);

      // On successful order placement:
      clearCart(); // Clear the cart
      // Navigate to home page after successful order
      navigate("/");
    } catch (error) {
      console.error("Error placing order:", error);
      // Try to get a user-friendly message from the backend response
      const errorMessage = error?.response?.data?.message || error.message ||
        "Failed to place order. Please try again.";
      setApiError(errorMessage);
      toast.error(errorMessage); // Show error toast
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Your cart is empty.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/products")} // Go back to products
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-base-100 p-6 rounded-lg shadow-lg border border-base-200">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 pb-4 border-b border-base-300"
              >
                <img
                  src={item.image}
                  alt={item.name || item.title} // Prefer 'name' if available, fallback to 'title'
                  className="w-16 h-16 object-contain bg-inherit p-2 rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.name || item.title}</h3>
                  <p className="text-primary font-bold">DZD {item.price}</p>
                  <p className="text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold">
                  DZD {(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="divider my-4"></div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>DZD {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery:</span>
              <span>
                {selectedDeliveryOption
                  ? (
                    <>
                      DZD {deliveryCostDZD.toFixed(2)}{" "}
                      ({selectedDeliveryOption.name})
                    </>
                  )
                  : (
                    "N/A"
                  )}
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-primary">DZD {totalDZD.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="bg-base-100 p-6 rounded-lg shadow-lg border border-base-200">
          <h2 className="text-xl font-bold mb-4">Shipping Information</h2>

          {/* Display API Error */}
          {apiError && (
            <div className="alert alert-error mb-4">
              <p>{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Required Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">
                  <span className="label-text">First name *</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${errors.firstName ? "input-error" : ""
                    }`}
                  placeholder="John"
                  disabled={loading} // Disable during loading
                />
                {errors.firstName && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.firstName}
                    </span>
                  </label>
                )}
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Last name *</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${errors.lastName ? "input-error" : ""
                    }`}
                  placeholder="Doe"
                  disabled={loading} // Disable during loading
                />
                {errors.lastName && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.lastName}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Phone * (e.g., +213...)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`input input-bordered w-full ${errors.phone ? "input-error" : ""
                  }`}
                placeholder="+2136XXXXXXXX"
                disabled={loading} // Disable during loading
              />
              {errors.phone && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.phone}
                  </span>
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">
                  <span className="label-text">Wilaya (Province) *</span>
                </label>
                <input
                  type="text"
                  name="wilaya"
                  value={formData.wilaya}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${errors.wilaya ? "input-error" : ""
                    }`}
                  placeholder="e.g., Algiers"
                  disabled={loading} // Disable during loading
                />
                {errors.wilaya && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.wilaya}
                    </span>
                  </label>
                )}
              </div>
              <div>
                <label className="label">
                  <span className="label-text">City *</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className={`input input-bordered w-full ${errors.city ? "input-error" : ""
                    }`}
                  placeholder="e.g., Bab Ezzouar"
                  disabled={loading} // Disable during loading
                />
                {errors.city && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.city}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Street Address (Optional)</span>
              </label>
              <input
                type="text"
                name="streetAddress"
                value={formData.streetAddress}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="e.g., 123 Main Street, Apt 4B"
                disabled={loading} // Disable during loading
              />
              {/* No error state for optional field unless made mandatory */}
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Delivery Service *</span>
              </label>
              {deliveryOptionsLoading
                ? (
                  <div className="flex items-center justify-center p-4">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                )
                : deliveryOptionsError
                  ? (
                    <div className="alert alert-error">
                      <p>{deliveryOptionsError}</p>
                    </div>
                  )
                  : (
                    <select
                      name="deliveryServiceId"
                      value={formData.deliveryServiceId}
                      onChange={handleInputChange}
                      className={`select select-bordered w-full ${errors.deliveryServiceId ? "select-error" : ""
                        }`}
                      disabled={loading || deliveryOptions.length === 0} // Disable during loading or if no options
                    >
                      <option value="" disabled>
                        Select a service
                      </option>
                      {deliveryOptions
                        .filter((option) => option.is_active) // Only show active options
                        .map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} - DZD{" "}
                            {(option.base_cost_cents / 100).toFixed(2)} (
                            {option.estimated_days} days)
                          </option>
                        ))}
                    </select>
                  )}
              {errors.deliveryServiceId && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.deliveryServiceId}
                  </span>
                </label>
              )}
            </div>

            {/* Display selected delivery option details */}
            {selectedDeliveryOption && !deliveryOptionsLoading && (
              <div className="mb-4 p-4 bg-base-200 rounded-box border border-base-300">
                <h3 className="font-bold mb-1">Selected Delivery:</h3>
                <p className="text-sm">{selectedDeliveryOption.name}</p>
                <p className="text-sm">
                  Cost: DZD {deliveryCostDZD.toFixed(2)}
                </p>
                <p className="text-sm">
                  Estimated Days: {selectedDeliveryOption.estimated_days}
                </p>
                <p className="text-sm mt-1 italic">
                  {selectedDeliveryOption.description}
                </p>
              </div>
            )}

            {/* Notes/Instructions */}
            <div className="mb-4">
              <label className="label">
                <span className="label-text">Order Notes (Optional)</span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="textarea textarea-bordered w-full"
                placeholder="Delivery instructions, gift note, etc..."
                rows="3"
                disabled={loading} // Disable during loading
              >
              </textarea>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading} // Disable button during API call
            >
              {loading
                ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2">
                    </span>
                    Placing Order...
                  </>
                )
                : (
                  "Place Order"
                )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
