// src/pages/Checkout.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

const Checkout = () => {
  const { cart, subtotal, clearCart } = useCart(); // Get cart data and clearCart function
  const navigate = useNavigate();

  // State for form inputs
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    wilayaCity: "", // Combined Wilaya/City field (you might want separate dropdowns later)
    deliveryService: "",
    commune: "",
    streetAddress: "",
    emailAddress: "",
    additionalInfo: "",
    orderNotes: "",
  });

  const [errors, setErrors] = useState({}); // State to store validation errors

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
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
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required.";
    if (!formData.wilayaCity.trim()) {
      newErrors.wilayaCity = "Wilaya / City is required.";
    }
    if (!formData.deliveryService.trim()) {
      newErrors.deliveryService = "Delivery service is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("Checkout submitted with:", { formData, cart });
      // Here you would typically call an API endpoint to process the order
      // After successful processing:
      clearCart(); // Clear the cart
      navigate("/order-confirmation"); // Navigate to a confirmation page (you'll need to create this too)
    }
  };

  // Calculate total (assuming no tax/shipping for now)
  const total = subtotal;

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen flex items-center justify-center">
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
    <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="bg-base-100 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 pb-4 border-b border-base-300"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-16 h-16 object-contain bg-base-200 p-2 rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
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
            {/* Tax and Shipping would go here if applicable */}
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>DZD {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        <div className="bg-base-100 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Shipping Information</h2>

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
                  className={`input input-bordered w-full ${
                    errors.firstName ? "input-error" : ""
                  }`}
                  placeholder="John"
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
                  className={`input input-bordered w-full ${
                    errors.lastName ? "input-error" : ""
                  }`}
                  placeholder="Doe"
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
                <span className="label-text">Phone *</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`input input-bordered w-full ${
                  errors.phone ? "input-error" : ""
                }`}
                placeholder="+1234567890"
              />
              {errors.phone && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.phone}
                  </span>
                </label>
              )}
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Wilaya / City *</span>
              </label>
              <input
                type="text"
                name="wilayaCity"
                value={formData.wilayaCity}
                onChange={handleInputChange}
                className={`input input-bordered w-full ${
                  errors.wilayaCity ? "input-error" : ""
                }`}
                placeholder="e.g., Algiers"
              />
              {errors.wilayaCity && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.wilayaCity}
                  </span>
                </label>
              )}
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Delivery Service *</span>
              </label>
              <select
                name="deliveryService"
                value={formData.deliveryService}
                onChange={handleInputChange}
                className={`select select-bordered w-full ${
                  errors.deliveryService ? "select-error" : ""
                }`}
              >
                <option value="" disabled>Select a service</option>
                <option value="service-a">Delivery Service A</option>
                <option value="service-b">Delivery Service B</option>
                <option value="service-c">Delivery Service C</option>
                {/* Add more options as needed */}
              </select>
              {errors.deliveryService && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.deliveryService}
                  </span>
                </label>
              )}
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">
                  <span className="label-text">Commune (optional)</span>
                </label>
                <input
                  type="text"
                  name="commune"
                  value={formData.commune}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="e.g., El Biar"
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Street address (optional)</span>
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  value={formData.streetAddress}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  placeholder="e.g., 123 Main Street"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Email address (optional)</span>
              </label>
              <input
                type="email"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleInputChange}
                className="input input-bordered w-full"
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="mb-4">
              <label className="label">
                <span className="label-text">Additional information</span>
              </label>
              <textarea
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange}
                className="textarea textarea-bordered w-full"
                placeholder="e.g., Delivery instructions, apartment number..."
                rows="2"
              >
              </textarea>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Place Order
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
