import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext"; // Import AuthProvider
import Navbar from "./components/NavBar";
import Footer from "./components/Footer"; // Import the new Footer component
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import BuildPC from "./pages/BuildPC";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout"; // Import the new Checkout page
import Account from "./pages/Account"; // Import Account page
import AuthPage from "./pages/Auth"; // Import the new Auth page

function App() {
  return (
    <AuthProvider>
      {/* Wrap everything with AuthProvider */}
      <CartProvider>
        <Router>
          {/* Removed bg-base-100 from here. Let daisyUI theme handle it. */}
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              {/* Flex-grow pushes footer to bottom */}
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/build-pc" element={<BuildPC />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />{" "}
                {/* Checkout route */}
                <Route path="/account" element={<Account />} />{" "}
                {/* Account route */}
                <Route path="/auth" element={<AuthPage />} /> {/* Auth route */}
              </Routes>
            </main>
            <div className="border-t border-base-300 my-8"></div>
            <Footer /> {/* Add Footer here */}
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
