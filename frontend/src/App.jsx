import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Gallery from "./pages/Gallery";
import BookDetail from "./pages/BookDetail";
import ArtistPage from "./pages/ArtistPage";

const StaticPage   = lazy(() => import("./pages/StaticPage"));
const AdminLayout  = lazy(() => import("./admin/AdminLayout"));
const AdminBooks   = lazy(() => import("./admin/AdminBooks"));
const AdminBookForm    = lazy(() => import("./admin/AdminBookForm"));
const AdminArtists     = lazy(() => import("./admin/AdminArtists"));
const AdminArtistForm  = lazy(() => import("./admin/AdminArtistForm"));
const AdminTags    = lazy(() => import("./admin/AdminTags"));
const AdminPages   = lazy(() => import("./admin/AdminPages"));
const AdminFooter  = lazy(() => import("./admin/AdminFooter"));

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public — eager */}
        <Route path="/" element={<Gallery />} />
        <Route path="/books/:slug" element={<BookDetail />} />
        <Route path="/artists/:slug" element={<ArtistPage />} />

        {/* Admin — lazy chunk, only loaded when /admin/* is visited */}
        <Route path="/admin" element={<Suspense fallback={null}><AdminLayout /></Suspense>}>
          <Route index element={<Suspense fallback={null}><AdminBooks /></Suspense>} />
          <Route path="books/new" element={<Suspense fallback={null}><AdminBookForm /></Suspense>} />
          <Route path="books/:id" element={<Suspense fallback={null}><AdminBookForm /></Suspense>} />
          <Route path="artists" element={<Suspense fallback={null}><AdminArtists /></Suspense>} />
          <Route path="artists/new" element={<Suspense fallback={null}><AdminArtistForm /></Suspense>} />
          <Route path="artists/:id" element={<Suspense fallback={null}><AdminArtistForm /></Suspense>} />
          <Route path="tags" element={<Suspense fallback={null}><AdminTags /></Suspense>} />
          <Route path="pages" element={<Suspense fallback={null}><AdminPages /></Suspense>} />
          <Route path="footer" element={<Suspense fallback={null}><AdminFooter /></Suspense>} />
        </Route>

        {/* Static pages — lazy, rarely visited */}
        <Route path="/:slug" element={<Suspense fallback={null}><StaticPage /></Suspense>} />
      </Routes>
    </AuthProvider>
  );
}
