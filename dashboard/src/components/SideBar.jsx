// src/components/Sidebar.jsx
import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  CogIcon,
  DocumentTextIcon,
  HomeIcon,
  ShoppingBagIcon,
  Squares2X2Icon, // Icon for the main grouping section
  TagIcon,
  TruckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline"; // Use outline style initially
import Logo from "../assets/logo.jpg";

const Sidebar = () => {
  // Group navigation items
  const groupedNavItems = [
    {
      name: "Main",
      icon: Squares2X2Icon, // Generic icon for the group
      items: [
        { name: "Dashboard", path: "/admin/dashboard", icon: HomeIcon },
      ],
    },
    {
      name: "Catalog",
      icon: ShoppingBagIcon, // Use an icon representative of the group
      items: [
        { name: "Products", path: "/admin/products", icon: ShoppingBagIcon },
        { name: "Categories", path: "/admin/categories", icon: TagIcon },
        { name: "Discounts", path: "/admin/discounts", icon: TagIcon }, // Add Discounts link
      ],
    },
    {
      name: "Sales",
      icon: DocumentTextIcon, // Use an icon representative of the group
      items: [
        { name: "Orders", path: "/admin/orders", icon: DocumentTextIcon },
        { name: "Customers", path: "/admin/customers", icon: UserGroupIcon },
      ],
    },
    {
      name: "Operations",
      icon: TruckIcon, // Use an icon representative of the group
      items: [
        { name: "Delivery", path: "/admin/delivery", icon: TruckIcon },
      ],
    },
    {
      name: "System",
      icon: CogIcon, // Use an icon representative of the group
      items: [
        { name: "Settings", path: "/admin/settings", icon: CogIcon },
      ],
    },
  ];

  return (
    <ul className="menu bg-neutral w-64 min-h-full p-4 text-base-content">
      <li className="mb-4 avatar">
        <div className="flex mask mask-hexagon items-center space-x-2 p-2">
          <img src={Logo} alt="Logo" />
        </div>
      </li>
      <div className="divider"></div>

      {groupedNavItems.map((group) => (
        <li key={group.name} tabIndex={0}>
          {/* Add tabIndex for keyboard accessibility */}
          <details open>
            {/* You can set open={false} to have groups collapsed by default */}
            <summary className="flex items-center">
              {/* Render the group icon */}
              <group.icon className="w-5 h-5 mr-2" />
              {group.name}
            </summary>
            <ul>
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      isActive ? "active bg-primary text-primary-content" : ""}
                    end
                  >
                    {/* Render the item icon */}
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
};

export default Sidebar;
