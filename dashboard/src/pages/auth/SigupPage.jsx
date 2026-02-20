import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"; // Import z from zod

// Define the validation schema using Zod
const signupSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters long.",
  }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters long.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Please confirm your password.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"], // Path of error
});

const SignupPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize react-hook-form with zodResolver
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(signupSchema), // Pass the Zod schema
  });

  const onSubmit = async (data) => {
    console.log("Signup Data:", data); // Log form data on submit
    setLoading(true);
    setError(""); // Clear previous errors

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      // Example simulated response:
      // const response = await axios.post('/api/auth/signup', data);
      // const { user, token } = response.data;
      // --- End Simulation ---

      // Example success handling (replace with real API logic)
      // login(user, token); // Update auth store if applicable
      reset(); // Reset form fields on success
      // Optionally, show a success toast notification using Sonner
      // toast.success('Account created successfully!');
      // Navigate to login page after successful signup
      navigate("/auth/login");
    } catch (err) {
      // Example error handling (replace with real API logic)
      console.error("Signup Error:", err);
      setError(err.message || "An error occurred during signup.");
    } finally {
      setLoading(false); // Stop loading indicator
    }
  };

  return (
    <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
      <div className="card-body">
        <h1 className="text-2xl font-bold text-center">Sign Up</h1>
        {/* Display general error message if any */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Form using react-hook-form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Full Name Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Full Name</span>
            </label>
            <input
              type="text"
              placeholder="John Doe"
              className={`input input-bordered ${
                errors.name ? "input-error" : ""
              }`} // Apply error style if validation fails
              {...register("name")}
            />
            {/* Display specific error message for name */}
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* Email Field */}
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

          {/* Password Field */}
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
              <p className="text-red-500 text-xs">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Confirm Password</span>
            </label>
            <input
              type="password"
              placeholder="password again"
              className={`input input-bordered ${
                errors.confirmPassword ? "input-error" : ""
              }`}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="form-control mt-6">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {/* Show loading spinner or text depending on loading state */}
              {loading
                ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2">
                    </span>{" "}
                    Signing Up...
                  </>
                )
                : "Sign Up"}
            </button>
          </div>
        </form>

        {/* Link to Login Page */}
        <div className="text-center mt-4">
          <p>
            Already have an account?{" "}
            <a href="/auth/login" className="link link-primary">Login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
