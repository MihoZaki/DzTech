// src/components/Footer.jsx - Simplified Version
import React from "react";
// Remove ExternalLinkIcon if it's causing issues
import {
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/24/outline"; // Using MapPinIcon instead of LocationMarkerIcon
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer bg-base-200 text-base-content p-10">
      <div>
        <span className="footer-title">Services</span>
        <Link to="/build-pc" className="link link-hover">Build Your PC</Link>
        <Link to="/products" className="link link-hover">Browse Products</Link>
        <Link to="/cart" className="link link-hover">Shopping Cart</Link>
      </div>
      <div>
        <span className="footer-title">Company</span>
        <Link to="/about" className="link link-hover">About Us</Link>
        <Link to="/contact" className="link link-hover">Contact</Link>
      </div>
      <div>
        <span className="footer-title">Legal</span>
        <a href="#" className="link link-hover">Terms of Use</a>
        <a href="#" className="link link-hover">Privacy Policy</a>
        <a href="#" className="link link-hover">Cookie Policy</a>
      </div>
      <div>
        <span className="footer-title">Contact</span>
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="h-5 w-5 text-gray-400" />

          <span>info@alm-informatique.com</span>
        </div>
        <div className="flex items-center gap-2">
          <PhoneIcon className="h-5 w-5 text-gray-400" />
          <span>+079999999</span>
        </div>
        <div className="flex items-start gap-2">
          {/* Changed LocationMarkerIcon to MapPinIcon */}
          <MapPinIcon className="h-5 w-5 text-gray-400 mt-1" />
          <span>TAHER, Jijel, Algeria</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
