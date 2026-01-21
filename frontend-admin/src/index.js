// src/index.js
import React from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";
import { createRoot } from "react-dom/client"; // Import createRoot

import "@fortawesome/fontawesome-free/css/all.min.css";
import "assets/styles/tailwind.css";

// layouts
import Admin from "layouts/Admin.js";
import Auth from "layouts/Auth.js";

// views without layouts
import Index from "views/Index.js";

// Get the root element
const container = document.getElementById("root");
const root = createRoot(container); // Create the root instance

// Render the app using the new root.render() method
root.render(
  <BrowserRouter>
    <Switch>
      {/* add routes with layouts */}
      <Route path="/admin" component={Admin} />
      <Route path="/auth" component={Auth} />
      {/* add routes without layouts */}
      <Route path="/" exact component={Index} />
      {/* add redirect for first page */}
      <Redirect from="*" to="/" />
    </Switch>
  </BrowserRouter>,
);
