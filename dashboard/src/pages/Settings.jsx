import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeUserPassword, updateUserProfile } from "../services/api";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema for Profile Update
const profileSchema = z.object({
  full_name: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
});

// Schema for Password Change
const passwordSchema = z.object({
  current_password: z.string().min(1, {
    message: "Current password is required.",
  }),
  new_password: z.string().min(8, {
    message: "New password must be at least 8 characters long.",
  }),
  confirm_password: z.string().min(1, {
    message: "Please confirm your new password.",
  }),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords do not match.",
  path: ["confirm_password"],
});

const Settings = () => {
  const queryClient = useQueryClient();
  const storedUserDataString = localStorage.getItem("user"); // Assuming the key is "user"
  let storedUserData = null;
  if (storedUserDataString) {
    try {
      storedUserData = JSON.parse(storedUserDataString);
    } catch (e) {
      console.error("Error parsing user data from localStorage:", e);
      // Handle potential parsing errors gracefully, maybe redirect to login
    }
  }

  const currentUserId = storedUserData?.id; // Extract ID from the parsed object
  // --- END NEW ---

  // Fetch current user data using the ID from localStorage
  // NOTE: This assumes there's an endpoint like GET /v1/user/{id} or GET /v1/user/me
  // If the backend has a specific endpoint for the *current* authenticated user (e.g., /v1/auth/me or /v1/user/profile),
  // you might not need the ID and could fetch directly.
  // For now, let's assume fetchUserById works or you have fetchCurrentUser.
  // Placeholder: Replace with actual API call if needed.
  // const {
  //    userData,
  //   isLoading: userLoading,
  //   isError: userError,
  //   error: userApiError,
  // } = useQuery({
  //   queryKey: ["currentUser", currentUserId],
  //   queryFn: () => fetchUserById(currentUserId), // Use the correct API function
  //   select: (response) => response.data,
  //   enabled: !!currentUserId,
  // });

  const userData = storedUserData; // Use the data from localStorage
  const userLoading = false; // No loading state needed if using localStorage
  const userError = !storedUserData; // Error if data couldn't be retrieved/parsed
  const userApiError = userError
    ? new Error("Could not load user data from storage.")
    : null;

  // --- Profile Update Section ---
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
    setValue: setProfileValue,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile, // Uses the API function defined in api.js
    onSuccess: (data, variables) => { // data is the response, variables are the input (variables.full_name, variables.email)
      if (data && data.data) { // Adjust based on your API response structure (e.g., { success: true, data: { ...updated_user_data... } })
        const updatedStoredData = {
          ...storedUserData, // Spread existing data
          full_name: data.data.full_name || variables.full_name, // Prefer data from API response
          email: data.data.email || variables.email,
          updated_at: data.data.updated_at || new Date().toISOString(), // Update timestamp if provided by API
        };
        localStorage.setItem("user", JSON.stringify(updatedStoredData));
        toast.success("Profile updated successfully!");
        // Reset form to the *new* values from the API response or the submitted ones
        resetProfileForm({
          full_name: updatedStoredData.full_name,
          email: updatedStoredData.email,
        });
      } else {
        // If API response doesn't contain updated user data, optimistically update based on submitted vars
        const optimisticUpdatedData = {
          ...storedUserData,
          full_name: variables.full_name,
          email: variables.email,
          updated_at: new Date().toISOString(), // Update timestamp optimistically
        };
        localStorage.setItem("user", JSON.stringify(optimisticUpdatedData));
        toast.success("Profile updated successfully!");
        resetProfileForm({ // Reset to the submitted values
          full_name: variables.full_name,
          email: variables.email,
        });
      }
      // Optionally invalidate queries if other parts of the app rely on user data fetched via queries
      // queryClient.invalidateQueries({ queryKey: ["currentUser", currentUserId] });
    },
    onError: (error) => {
      console.error("Update Profile Error:", error);
      // Attempt to get error message from response body
      const errorMessage = error.response?.data?.message || error.message ||
        "Unknown error";
      toast.error(`Failed to update profile: ${errorMessage}`);
    },
  });

  const onSubmitProfile = (data) => {
    console.log("Submitting Profile Update Data:", data);
    updateProfileMutation.mutate(data);
  };

  // Prefill profile form when userData is available (from localStorage)
  React.useEffect(() => {
    if (userData) {
      setProfileValue("full_name", userData.full_name || "");
      setProfileValue("email", userData.email || "");
    }
  }, [userData, setProfileValue]); // Depend on userData from localStorage now

  // --- Password Change Section ---
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeUserPassword, // Uses the API function defined in api.js
    onSuccess: (data) => {
      toast.success("Password changed successfully!");
      resetPasswordForm(); // Clear the password form after success
      // No need to update localStorage for password change unless the API returns new tokens or user data
    },
    onError: (error) => {
      console.error("Change Password Error:", error);
      // Attempt to get error message from response body
      const errorMessage = error.response?.data?.message || error.message ||
        "Unknown error";
      toast.error(`Failed to change password: ${errorMessage}`);
    },
  });

  const onSubmitPassword = (data) => {
    console.log("Submitting Password Change Data:", data);
    changePasswordMutation.mutate(data);
  };

  if (userError) {
    return (
      <div className="alert alert-error">
        Error: {userApiError.message}. Please log in again.
        {/* You might want to trigger a logout here */}
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="alert alert-warning">
        User data not available.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Update Card */}
        <div className="bg-neutral p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Update Profile</h2>
          <form
            onSubmit={handleSubmitProfile(onSubmitProfile)}
            className="space-y-4"
          >
            <div className="form-control">
              <label className="label">
                <span className="label-text">Full Name</span>
              </label>
              <input
                type="text"
                className={`input input-bordered ${
                  profileErrors.full_name ? "input-error" : ""
                }`}
                placeholder="Enter your full name..."
                {...registerProfile("full_name")}
              />
              {profileErrors.full_name && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {profileErrors.full_name.message}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className={`input input-bordered ${
                  profileErrors.email ? "input-error" : ""
                }`}
                placeholder="Enter your email..."
                {...registerProfile("email")}
              />
              {profileErrors.email && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {profileErrors.email.message}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending
                  ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2">
                      </span>{" "}
                      Updating...
                    </>
                  )
                  : "Update Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Password Change Card */}
        <div className="bg-neutral p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Change Password</h2>
          <form
            onSubmit={handleSubmitPassword(onSubmitPassword)}
            className="space-y-4"
          >
            <div className="form-control">
              <label className="label">
                <span className="label-text">Current Password</span>
              </label>
              <input
                type="password"
                className={`input input-bordered ${
                  passwordErrors.current_password ? "input-error" : ""
                }`}
                placeholder="Enter your current password..."
                {...registerPassword("current_password")}
              />
              {passwordErrors.current_password && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {passwordErrors.current_password.message}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">New Password</span>
              </label>
              <input
                type="password"
                className={`input input-bordered ${
                  passwordErrors.new_password ? "input-error" : ""
                }`}
                placeholder="Enter your new password..."
                {...registerPassword("new_password")}
              />
              {passwordErrors.new_password && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {passwordErrors.new_password.message}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm New Password</span>
              </label>
              <input
                type="password"
                className={`input input-bordered ${
                  passwordErrors.confirm_password ? "input-error" : ""
                }`}
                placeholder="Confirm your new password..."
                {...registerPassword("confirm_password")}
              />
              {passwordErrors.confirm_password && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {passwordErrors.confirm_password.message}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending
                  ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2">
                      </span>{" "}
                      Changing...
                    </>
                  )
                  : "Change Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
