import React from "react";
import { Redirect, Route, Switch } from "react-router-dom";
import AdminNavbar from "components/Navbars/AdminNavbar.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import HeaderStats from "components/Headers/HeaderStats.js";
import FooterAdmin from "components/Footers/FooterAdmin.js";
import Dashboard from "views/admin/Dashboard.js";
import AddProduct from "views/admin/AddProduct.js";
import EditProduct from "views/admin/EditProduct.js";
import Products from "views/admin/Products.js";
import Orders from "views/admin/Orders.js";
import Customers from "views/admin/Customers.js";
import Categories from "views/admin/Categories.js";
import AddCategory from "views/admin/AddCategory.js";
import EditCategory from "views/admin/EditCategory.js";
import DeliveryServices from "views/admin/DeliveryServices.js";
import AddDeliveryService from "views/admin/AddDeliveryService.js";
import EditDeliveryService from "views/admin/EditDeliveryService.js";

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
            <Route path="/admin/orders" exact component={Orders} />
            <Route path="/admin/customers" exact component={Customers} />
            <Route path="/admin/categories" exact component={Categories} />
            <Route path="/admin/categories/new" exact component={AddCategory} />
            <Route
              path="/admin/categories/:id/edit"
              exact
              component={EditCategory}
            />
            <Route
              path="/admin/delivery-services"
              exact
              component={DeliveryServices}
            />
            <Route
              path="/admin/delivery-services/new"
              exact
              component={AddDeliveryService}
            />
            <Route
              path="/admin/delivery-services/:id/edit"
              exact
              component={EditDeliveryService}
            />
            <Route path="/admin/products/new" exact component={AddProduct} />
            <Route path="/admin/products" exact component={Products} />
            <Route
              path="/admin/products/:id/edit"
              exact
              component={EditProduct}
            />
            <Redirect from="/admin" to="/admin/dashboard" />
          </Switch>
        </div>
        <FooterAdmin />
      </div>
    </>
  );
}
