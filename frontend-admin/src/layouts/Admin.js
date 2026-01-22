// src/layouts/Admin.js
import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";

// components
import AdminNavbar from "components/Navbars/AdminNavbar.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import HeaderStats from "components/Headers/HeaderStats.js";
import FooterAdmin from "components/Footers/FooterAdmin.js";

// views
import Dashboard from "views/admin/Dashboard.js";
import AddProduct from "views/admin/AddProduct.js";
import EditProduct from "views/admin/EditProduct.js";
import Products from "views/admin/Products.js"; // Updated import path
import Orders from "views/admin/Orders.js";

import Customers from "views/admin/Customers.js";

export default function Admin() {
  return (
    <>
      <Sidebar />
      <div className="relative md:ml-64 bg-blueGray-100 flex flex-col min-h-screen">
        <AdminNavbar />
        <HeaderStats />
        <div className="px-4 md:px-10 mx-auto w-full -m-24 flex-grow">
          <Switch>
            <Route path="/admin/dashboard" exact component={Dashboard} />
            {/* NEW: Add route for the orders list view */}
            <Route path="/admin/orders" exact component={Orders} />
            {/* NEW: Add route for the customers list view */}
            <Route path="/admin/customers" exact component={Customers} />
            {/* NEW: Add route for adding a product */}
            <Route path="/admin/products/new" exact component={AddProduct} />
            {/* NEW: Add route for the product list view - PLACE BEFORE THE EDIT ROUTE */}
            <Route path="/admin/products" exact component={Products} />{" "}
            {/* General list route */}
            {/* NEW: Add route for editing a product - PLACE AFTER THE LIST ROUTE */}
            <Route
              path="/admin/products/:id/edit"
              exact
              component={EditProduct}
            />{" "}
            {/* Specific edit route */}
            <Redirect from="/admin" to="/admin/dashboard" />
          </Switch>
        </div>
        <FooterAdmin />
      </div>
    </>
  );
}
