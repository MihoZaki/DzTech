// src/App.jsx
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AuthPage from "./pages/auth/AuthPage";
import NotFound from "./pages/NotFound";
import ProductsList from "./pages/products/ProductsList";
import AddProduct from "./pages/products/AddProduct";
import EditProduct from "./pages/products/EditProduct";
import ProductView from "./pages/products/ProductView";
import CategoriesList from "./pages/categories/CategoriesList";
import AddCategory from "./pages/categories/AddCategory";
import EditCategory from "./pages/categories/EditCategory";
import OrdersList from "./pages/orders/OrdersList";
import OrderDetails from "./pages/orders/OrderDetails";
import DeliveryServicesList from "./pages/delivery/DeliveryServicesList";
import AddDeliveryService from "./pages/delivery/AddDeliveryService";
import EditDeliveryService from "./pages/delivery/EditDeliveryService";
import CustomersList from "./pages/customers/CustomerList";
import DiscountsList from "./pages/discounts/DiscountsList";
import AddDiscount from "./pages/discounts/AddDiscount";
import EditDiscount from "./pages/discounts/EditDiscount";
import Settings from "./pages/Settings"; // Import the new Settings component

function App() {
  return (
    <div className="min-h-screen bg-base-100">
      <Routes>
        <Route path="/auth/*" element={<AuthPage />} />

        <Route
          path="/admin"
          element={<Navigate to="/admin/dashboard" replace />}
        />
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<ProductsList />} />
          <Route path="products/add" element={<AddProduct />} />
          <Route path="products/:id" element={<ProductView />} />
          <Route path="products/:id/edit" element={<EditProduct />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="categories" element={<CategoriesList />} />
          <Route path="categories/add" element={<AddCategory />} />
          <Route path="categories/:id/edit" element={<EditCategory />} />
          <Route path="delivery" element={<DeliveryServicesList />} />
          <Route path="delivery/add" element={<AddDeliveryService />} />
          <Route path="delivery/:id/edit" element={<EditDeliveryService />} />
          <Route path="customers" element={<CustomersList />} />
          <Route path="discounts" element={<DiscountsList />} />
          <Route path="discounts/add" element={<AddDiscount />} />
          <Route path="discounts/:id/edit" element={<EditDiscount />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
