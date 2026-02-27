import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";
import Navbar from "./components/NavBar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import BuildPC from "./pages/BuildPC";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Account from "./pages/Account";
import AccountSettings from "./pages/AccountSettings";
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import AuthPage from "./pages/Auth";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/build-pc" element={<BuildPC />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />{" "}
                <Route path="/account" element={<Account />} />{" "}
                <Route path="/account/settings" element={<AccountSettings />} />
                {" "}
                <Route path="/account/orders" element={<MyOrders />} />{" "}
                <Route
                  path="/account/order/:orderId"
                  element={<OrderDetails />}
                />{" "}
                <Route path="/auth" element={<AuthPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
          <Toaster position="bottom-right" richColors />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
