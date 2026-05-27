import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import AdminLayout from "./admin/AdminLayout";
import AdminBooks from "./admin/AdminBooks";
import AdminBookForm from "./admin/AdminBookForm";
import AdminArtists from "./admin/AdminArtists";
import AdminArtistForm from "./admin/AdminArtistForm";
import AdminTags from "./admin/AdminTags";
import AdminPages from "./admin/AdminPages";
import AdminFooter from "./admin/AdminFooter";
import Gallery from "./pages/Gallery";
import BookDetail from "./pages/BookDetail";
import ArtistPage from "./pages/ArtistPage";
import StaticPage from "./pages/StaticPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Gallery />} />
        <Route path="/books/:slug" element={<BookDetail />} />
        <Route path="/artists/:slug" element={<ArtistPage />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminBooks />} />
          <Route path="books/new" element={<AdminBookForm />} />
          <Route path="books/:id" element={<AdminBookForm />} />
          <Route path="artists" element={<AdminArtists />} />
          <Route path="artists/new" element={<AdminArtistForm />} />
          <Route path="artists/:id" element={<AdminArtistForm />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="footer" element={<AdminFooter />} />
        </Route>

        {/* Static pages — catch-all after all specific routes */}
        <Route path="/:slug" element={<StaticPage />} />
      </Routes>
    </AuthProvider>
  );
}
