// src/views/Index.js
import React, { useEffect } from "react";
import { useHistory } from "react-router-dom"; // Import useHistory for React Router v5

function isUserLoggedIn() {
  return true;
}

export default function Index() {
  const history = useHistory(); // Use the hook to get the history object

  useEffect(() => {
    if (isUserLoggedIn()) {
      // If logged in, redirect to the admin dashboard
      history.push("/admin/dashboard");
    } else {
      history.push("/auth/login");
    }
  }, [history]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-blueGray-500">
      {/* Changed bg color to match template theme */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">DzTech Admin</h2>{" "}
        {/* Made text white for contrast */}
        <p className="text-blueGray-200">Checking authentication...</p>{" "}
        {/* Made subtext lighter white/gray */}
      </div>
    </div>
  );
}
