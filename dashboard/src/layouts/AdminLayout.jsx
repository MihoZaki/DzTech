import React from "react";
import { Outlet } from "react-router-dom"; // Outlet is where child routes are rendered
import Sidebar from "../components/SideBar"; // We'll create this next
import AdminHeader from "../components/AdminHeader"; // We'll create this next

const AdminLayout = () => {
  return (
    <div className="drawer lg:drawer-open">
      {/* DaisyUI drawer for responsive sidebar */}
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        {/* Header */}
        <AdminHeader />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 bg-base-100">
          <Outlet />{" "}
          {/* Child routes like /admin/products, /admin/orders will render here */}
        </main>

        {/* Footer (optional) */}
        <footer className="p-4 text-center text-sm text-gray-500 border-t">
          © {new Date().getFullYear()} YC Informatique. All rights reserved.
        </footer>
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>
        <Sidebar />
      </div>
    </div>
  );
};

export default AdminLayout;
