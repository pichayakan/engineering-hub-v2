// frontend/src/utils/RedirectIfAuth.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

const RedirectIfAuth = () => {
  const { user } = useAuth();

  // If a user is logged in, redirect them to the homepage.
  // Otherwise, show the child component (e.g., the LoginPage).
  return user ? <Navigate to="/" /> : <Outlet />;
};

export default RedirectIfAuth;
