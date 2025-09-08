import React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import Editor from "./pages/EditorShell.jsx";
import Home from "./pages/Home.jsx";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/editor/:id?", element: <Editor /> },
]);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
