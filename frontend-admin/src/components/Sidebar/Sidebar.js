/*eslint-disable*/
import React from "react";
import { Link, useLocation } from "react-router-dom"; // Import useLocation hook

import NotificationDropdown from "components/Dropdowns/NotificationDropdown.js";
import UserDropdown from "components/Dropdowns/UserDropdown.js";

// Define navigation items in a structured way
const navItems = [
  {
    path: "/admin/dashboard",
    label: "Dashboard",
    icon: "fas fa-tv",
  },
  {
    path: "/admin/orders",
    label: "Orders",
    icon: "fas fa-shopping-cart",
  },
  {
    path: "/admin/customers",
    label: "Customers",
    icon: "fas fa-user-friends",
  },
  {
    path: "/admin/products",
    label: "Products",
    icon: "fas fa-table",
  },
];

// Define auth items (if needed separately, otherwise can add to navItems)
const authItems = [
  {
    path: "/auth/login",
    label: "Login",
    icon: "fas fa-fingerprint",
  },
  {
    path: "/auth/register",
    label: "Register",
    icon: "fas fa-clipboard-list",
  },
];

// Helper function to determine active link styles
const getNavLinkClasses = (locationPath, itemPath) => {
  const isActive = locationPath === itemPath;
  return `text-xs uppercase py-3 font-bold block ${
    isActive
      ? "text-lightBlue-500 hover:text-lightBlue-600"
      : "text-blueGray-700 hover:text-blueGray-500"
  }`;
};

// Helper function to determine active icon styles and combine with icon class
const getNavIconElement = (locationPath, itemPath, iconClass) => {
  const isActive = locationPath === itemPath;
  const baseIconClass = "mr-2 text-sm "; // Base classes
  const activeInactiveClass = isActive ? "opacity-75" : "text-blueGray-300"; // Active/inactive specific class
  const fullIconClass = baseIconClass + activeInactiveClass; // Combine them

  return (
    <i className={fullIconClass}>
      {/* Apply combined class to the <i> tag */}
      <i className={iconClass}></i>{" "}
      {/* Render the actual Font Awesome icon inside */}
    </i>
  );
};

// Helper function for auth icons (simpler, always greyish)
const getAuthIconElement = (iconClass) => {
  return (
    <i className={`mr-2 text-sm text-blueGray-400`}>
      {/* Fixed class for auth icons */}
      <i className={iconClass}></i>{" "}
      {/* Render the actual Font Awesome icon inside */}
    </i>
  );
};

export default function Sidebar() {
  const [collapseShow, setCollapseShow] = React.useState("hidden");
  const location = useLocation(); // Get the current location using the hook

  return (
    <>
      <nav className="md:left-0 md:block md:fixed md:top-0 md:bottom-0 md:overflow-y-auto md:flex-row md:flex-nowrap md:overflow-hidden shadow-xl bg-white flex flex-wrap items-center justify-between relative md:w-64 z-10 py-4 px-6">
        <div className="md:flex-col md:items-stretch md:min-h-full md:flex-nowrap px-0 flex flex-wrap items-center justify-between w-full mx-auto">
          {/* Toggler */}
          <button
            className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
            type="button"
            onClick={() => setCollapseShow("bg-white m-2 py-3 px-6")}
          >
            <i className="fas fa-bars"></i>
          </button>
          {/* Brand */}
          <Link
            className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
            to="/"
          >
            DzTech Admin
          </Link>
          {/* User */}
          <ul className="md:hidden items-center flex flex-wrap list-none">
            <li className="inline-block relative">
              <NotificationDropdown />
            </li>
            <li className="inline-block relative">
              <UserDropdown />
            </li>
          </ul>
          {/* Collapse */}
          <div
            className={"md:flex md:flex-col md:items-stretch md:opacity-100 md:relative md:mt-4 md:shadow-none shadow absolute top-0 left-0 right-0 z-40 overflow-y-auto overflow-x-hidden h-auto items-center flex-1 rounded " +
              collapseShow}
          >
            {/* Collapse header */}
            <div className="md:min-w-full md:hidden block pb-4 mb-4 border-b border-solid border-blueGray-200">
              <div className="flex flex-wrap">
                <div className="w-6/12">
                  <Link
                    className="md:block text-left md:pb-2 text-blueGray-600 mr-0 inline-block whitespace-nowrap text-sm uppercase font-bold p-4 px-0"
                    to="/"
                  >
                    Notus React
                  </Link>
                </div>
                <div className="w-6/12 flex justify-end">
                  <button
                    type="button"
                    className="cursor-pointer text-black opacity-50 md:hidden px-3 py-1 text-xl leading-none bg-transparent rounded border border-solid border-transparent"
                    onClick={() => setCollapseShow("hidden")}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            </div>
            {/* Form */}
            <form className="mt-6 mb-4 md:hidden">
              <div className="mb-3 pt-0">
                <input
                  type="text"
                  placeholder="Search"
                  className="border-0 px-3 py-2 h-12 border border-solid  border-blueGray-500 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-base leading-snug shadow-none outline-none focus:outline-none w-full font-normal"
                />
              </div>
            </form>

            {/* Divider */}
            <hr className="my-4 md:min-w-full" />
            {/* Heading */}
            <h6 className="md:min-w-full text-blueGray-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
              Main Navigation
            </h6>
            {/* Navigation */}
            <ul className="md:flex-col md:min-w-full flex flex-col list-none">
              {navItems.map((item) => (
                <li key={item.path} className="items-center">
                  <Link
                    className={getNavLinkClasses(location.pathname, item.path)} // Use helper function
                    to={item.path}
                  >
                    {getNavIconElement(location.pathname, item.path, item.icon)}
                    {" "}
                    {/* Use helper function for icon */}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}
