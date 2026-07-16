import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ListingFeed from "./pages/ListingFeed.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import CreateListing from "./pages/CreateListing.jsx";
import Cart from "./pages/Cart.jsx";
import Login from "./pages/Login.jsx";

function Nav() {
  const { user, loading } = useAuth();
  return (
    <nav>
      <Link to="/">Browse</Link>
      {!loading && user && (
        <>
          {" | "}
          <Link to="/listings/new">Sell an item</Link>
          {" | "}
          <Link to="/cart">Cart</Link>
          {" | "}
          <span>{user.email}</span>
        </>
      )}
      {!loading && !user && (
        <>
          {" | "}
          <Link to="/login">Log in</Link>
        </>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<ListingFeed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/listings/new" element={<CreateListing />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
