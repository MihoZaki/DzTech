// src/pages/AccountSettings.jsx
import React from "react";
import { Link } from "react-router-dom"; // Import Link
import { useAuth } from "../contexts/AuthContext"; // Import useAuth
import { toast } from "sonner"; // Import toast for notifications
import { useForm } from "react-hook-form"; // Import react-hook-form for form handling
import { zodResolver } from "@hookform/resolvers/zod"; // Import zodResolver
import { z } from "zod"; // Import zod
import { useMutation } from "@tanstack/react-query"; // Import useMutation
import {
  changeUserPassword, // API function to change password - needs to be implemented
  updateUserProfile, // API function to update profile - needs to be implemented
} from "../services/api"; // Import the API functions

// Define Zod Schemas for validation
const profileSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z
    .string()
    .min(8, { message: "New password must be at least 8 characters long" }),
  // Add more complex password requirements if needed
  // .regex(/[A-Z]/, { message: "Must contain an uppercase letter" })
  // .regex(/[a-z]/, { message: "Must contain a lowercase letter" })
  // .regex(/[0-9]/, { message: "Must contain a number" })
  // .regex(/[^A-Za-z0-9]/, { message: "Must contain a special character" }),
  confirmPassword: z.string().min(1, {
    message: "Please confirm your new password",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], // Path of error
});

const AccountSettings = () => {
  const { user, setUser } = useAuth(); // Get user from context and potentially setUser to update context after mutation
  // Note: Depending on your AuthContext implementation,
  // you might update the user context after a successful profile update
  // or rely on localStorage being updated by the API call/response.

  // --- PROFILE FORM SETUP ---
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfileForm, // To reset form after successful submission
    setValue, // Allows programmatic setting of field values
    watch, // Allows watching field values
    control: controlProfile, // Needed for Controller if using controlled inputs
  } = useForm({
    resolver: zodResolver(profileSchema), // Use zodResolver with the profile schema
    defaultValues: { // Set default values from the user object (from localStorage via AuthContext)
      name: user?.full_name || "",
      email: user?.email || "",
    },
  });

  // Watch for changes in the user object to update the form fields if necessary
  // (e.g., if another part of the app updates the user context)
  React.useEffect(() => {
    if (user) {
      // Only update if the current form values are the same as the initial ones
      // to avoid overriding user edits if the user object changes externally
      const currentValues = { name: watch("name"), email: watch("email") };
      const initialValues = {
        name: user.full_name || "",
        email: user.email || "",
      };
      if (
        JSON.stringify(currentValues) === JSON.stringify(initialValues)
      ) {
        setValue("name", user.full_name || "");
        setValue("email", user.email || "");
      }
    }
  }, [user, watch, setValue]);

  // --- PROFILE MUTATION ---
  const updateProfileMutation = useMutation({
    mutationFn: (variables) => { // variables type inferred implicitly
      // Prepare the payload (adjust field names if necessary)
      const payload = {
        full_name: variables.name,
        email: variables.email,
      };
      // Call the API function
      return updateUserProfile(payload); // Must be implemented in api.js
    },
    onSuccess: (data, variables) => {
      // Update the localStorage with the new profile data
      // Assumes the API returns the updated user object in 'data'
      // If the API returns minimal data, construct the object from variables:
      // const updatedUserData = { ...user, full_name: variables.name, email: variables.email };

      const updatedUserData = data ||
        { ...user, full_name: variables.name, email: variables.email };
      localStorage.setItem("userData", JSON.stringify(updatedUserData));

      // Optionally update the auth context if your context provider exposes a function to do so
      // For example, if your AuthContext has a function like setUser:
      // setUser(updatedUserData); // This depends on your AuthContext implementation

      toast.success("Profile updated successfully!");
      // Reset form to the submitted values
      resetProfileForm(variables);
    },
    onError: (error) => { // error type inferred implicitly
      console.error("Error updating profile:", error);
      // Try to get a user-friendly message from the backend response
      const errorMessage = error?.response?.data?.message || error.message ||
        "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    },
  });
  // Handle Profile Form Submission
  const onSubmitProfile = (formData) => { // formData type inferred implicitly
    // Trigger the mutation
    updateProfileMutation.mutate(formData);
  };

  // --- PASSWORD FORM SETUP ---
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm, // To reset form after successful submission
    watch: watchPassword, // To watch password fields for confirmation
    control: controlPassword, // Needed for Controller if using controlled inputs
  } = useForm({
    resolver: zodResolver(passwordSchema), // Use zodResolver with the password schema
  });

  // Watch the new password field for confirmation validation
  const newPassword = watchPassword("newPassword", ""); // Default to empty string

  // --- PASSWORD MUTATION ---
  const changePasswordMutation = useMutation({
    mutationFn: (variables) => { // variables type inferred implicitly
      // Prepare the payload (adjust field names if necessary)
      const payload = {
        old_password: variables.oldPassword, // Match backend field names
        new_password: variables.newPassword, // Match backend field names
      };
      // Call the API function
      return changeUserPassword(payload); // Must be implemented in api.js
    },
    onSuccess: (data) => {
      toast.success("Password changed successfully!");
      resetPasswordForm(); // Reset the password form after successful submission
      // Optionally, log the user out or handle token renewal here
      // depending on your backend's session management policy after password change.
    },
    onError: (error) => { // error type inferred implicitly
      console.error("Error changing password:", error);
      // Try to get a user-friendly message from the backend response
      const errorMessage = error?.response?.data?.message || error.message ||
        "Failed to change password. Please try again.";
      toast.error(errorMessage);
    },
  });

  // Handle Password Form Submission
  const onSubmitPassword = (formData) => { // formData type inferred implicitly
    // Trigger the mutation
    changePasswordMutation.mutate(formData);
  };

  if (!user) {
    // Optional: Handle case where user is not logged in
    return (
      <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
        <p>You are not logged in.</p>
        <Link to="/auth" className="btn btn-primary">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-inherit min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Back Button */}
      <div className="mb-6">
        <Link to="/account" className="btn btn-sm btn-ghost">
          &larr; Back to Account
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings Card */}
        <div className="card bg-base-100 shadow-lg border border-secondary-content">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Profile Information</h2>
            <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="profile-name" className="label">
                    <span className="label-text">Full Name</span>
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    className={`input input-bordered w-full ${
                      profileErrors.name ? "input-error" : ""
                    }`}
                    {...registerProfile("name")}
                    disabled={updateProfileMutation.isPending} // Disable while submitting
                  />
                  {profileErrors.name && (
                    <p className="text-error text-sm mt-1">
                      {profileErrors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="profile-email" className="label">
                    <span className="label-text">Email Address</span>
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    className={`input input-bordered w-full ${
                      profileErrors.email ? "input-error" : ""
                    }`}
                    {...registerProfile("email")}
                    disabled={updateProfileMutation.isPending} // Disable while submitting
                  />
                  {profileErrors.email && (
                    <p className="text-error text-sm mt-1">
                      {profileErrors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="card-actions justify-end mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateProfileMutation.isPending} // Use mutation's loading state
                >
                  {updateProfileMutation.isPending
                    ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-2">
                        </span>
                        Saving...
                      </>
                    )
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="card bg-base-100 shadow-lg border border-secondary-content">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Change Password</h2>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password-old" className="label">
                    <span className="label-text">Current Password</span>
                  </label>
                  <input
                    id="password-old"
                    type="password"
                    className={`input input-bordered w-full ${
                      passwordErrors.oldPassword ? "input-error" : ""
                    }`}
                    {...registerPassword("oldPassword")}
                    disabled={changePasswordMutation.isPending} // Disable while submitting
                  />
                  {passwordErrors.oldPassword && (
                    <p className="text-error text-sm mt-1">
                      {passwordErrors.oldPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password-new" className="label">
                    <span className="label-text">New Password</span>
                  </label>
                  <input
                    id="password-new"
                    type="password"
                    className={`input input-bordered w-full ${
                      passwordErrors.newPassword ? "input-error" : ""
                    }`}
                    {...registerPassword("newPassword")}
                    disabled={changePasswordMutation.isPending} // Disable while submitting
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-error text-sm mt-1">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password-confirm" className="label">
                    <span className="label-text">Confirm New Password</span>
                  </label>
                  <input
                    id="password-confirm"
                    type="password"
                    className={`input input-bordered w-full ${
                      passwordErrors.confirmPassword ? "input-error" : ""
                    }`}
                    {...registerPassword("confirmPassword")}
                    disabled={changePasswordMutation.isPending} // Disable while submitting
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-error text-sm mt-1">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="card-actions justify-end mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={changePasswordMutation.isPending} // Use mutation's loading state
                >
                  {changePasswordMutation.isPending
                    ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-2">
                        </span>
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
    </div>
  );
};

export default AccountSettings;
