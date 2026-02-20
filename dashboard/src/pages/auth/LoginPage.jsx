// src/pages/auth/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login as loginApiCall } from "../../services/api"; // Import the real API function
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline"; // Import icon if needed

// Optional: Define validation schema using Zod
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Adjust min length as needed
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { login: loginAction } = useAuthStore(); // Get login action from store
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");
    try {
      console.log("Attempting to log in with:", data);
      const response = await loginApiCall(data.email, data.password); // Call the real API function
      console.log("Login response:", response.data);

      const { user, access_token } = response.data; // Extract user and access_token from response body

      // On success, update store and navigate
      loginAction(user, access_token); // Update Zustand store and localStorage
      navigate("/admin/dashboard", { replace: true }); // Go to dashboard
    } catch (err) {
      console.error("Login error:", err);
      // Try to get specific error message from response, fallback to generic message
      let errorMessage = "Login failed";
      if (err.response) {
        // Server responded with error status
        if (err.response.status === 401) {
          errorMessage = "Invalid email or password.";
        } else {
          errorMessage = err.response.data?.message ||
            err.response.statusText || errorMessage;
        }
      } else if (err.request) {
        // Request was made but no response received (network error)
        errorMessage = "Network error. Please check your connection.";
      } else {
        // Something else happened
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col">
        <div className="card flex-shrink-0 w-full bg-primary-content max-w-sm shadow-2xl border border-primary">
          <div className="card-body">
            <h1 className="text-2xl font-bold text-center">Login</h1>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  placeholder="email@domain.com"
                  className={`input input-bordered ${
                    errors.email ? "input-error" : ""
                  }`}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs">{errors.email.message}</p>
                )}
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input
                  type="password"
                  placeholder="password"
                  className={`input input-bordered ${
                    errors.password ? "input-error" : ""
                  }`}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-red-500 text-xs">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="form-control mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-2">
                        </span>{" "}
                        Logging In...
                      </>
                    )
                    : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
