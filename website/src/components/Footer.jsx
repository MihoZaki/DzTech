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
      <div className="p-5">
        <span className="footer-title font-black ">Services</span>
        <Link to="/build-pc" className="link link-hover">
          Build Your PC
        </Link>
        <Link to="/products" className="link link-hover">
          Browse Products
        </Link>
        <Link to="/cart" className="link link-hover">
          Shopping Cart
        </Link>
      </div>
      <div className="p-5">
        <span className="footer-title font-black ">Company</span>
        <Link to="#" className="link link-hover">
          About Us
        </Link>
        <Link to="#" className="link link-hover">
          Contact
        </Link>
      </div>
      <div className="p-5">
        <span className="footer-title font-black ">Legal</span>
        <a href="#" className="link link-hover">
          Terms of Use
        </a>
        <a href="#" className="link link-hover">
          Privacy Policy
        </a>
        <a href="#" className="link link-hover">
          Cookie Policy
        </a>
      </div>
      <div className="p-5">
        <span className="footer-title font-black ">Contact</span>
        <div className="flex items-center gap-2">
          <EnvelopeIcon className="h-5 w-5 text-gray-400" />

          <span>ycinfo2026@gmail.com</span>
        </div>
        <div className="flex items-center gap-2">
          <PhoneIcon className="h-5 w-5 text-gray-400" />
          <span>+0791781303</span>
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
