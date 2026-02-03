import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  }); // Include name for signup
  const [error, setError] = useState("");

  const { login, user } = useAuth(); // Get login function and user state
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    navigate("/account"); // Or wherever you want to go after login
    return null; // Don't render anything while navigating
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    // Simple validation (add more as needed)
    if (!formData.email || !formData.password) {
      setError("Email and password are required.");
      return;
    }

    if (!isLogin && !formData.name) {
      setError("Name is required for signup.");
      return;
    }

    // Simulate successful login/signup
    // In a real app, you would call an API here
    console.log(
      `Attempting to ${isLogin ? "log in" : "sign up"} with:`,
      formData,
    );

    // For demo purposes, just call the login function which sets the user state
    // The login function in our mock context doesn't actually validate credentials
    login(formData);

    // Optionally, redirect after successful login/signup
    // navigate('/account'); // Already handled by the redirect check above if user becomes truthy
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen flex items-center justify-center">
      <div className="card bg-base-100 w-full max-w-md shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">
            {isLogin ? "Log In" : "Sign Up"}
          </h2>

          {error && <div className="alert alert-error mb-4">{error}</div>}

          <form onSubmit={handleSubmit}>
            {!isLogin && ( // Show name field only for signup
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Full Name</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  className="input input-bordered"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            )}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="email@example.com"
                className="input input-bordered"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="form-control mt-2">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className="input input-bordered"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary">
                {isLogin ? "Log In" : "Sign Up"}
              </button>
            </div>
          </form>

          <div className="divider my-4">OR</div>

          <div className="text-center">
            <p className="text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              {" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="link link-primary"
              >
                {isLogin ? "Sign Up" : "Log In"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
