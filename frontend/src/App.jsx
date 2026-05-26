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

function Placeholder({ name }) {
  return <div style={{ padding: "4rem 2rem", color: "var(--text-muted)", fontSize: "18px" }}>{name}</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public — Phase 4 */}
        <Route path="/" element={<Placeholder name="Gallery" />} />
        <Route path="/books/:slug" element={<Placeholder name="Book" />} />
        <Route path="/artists/:slug" element={<Placeholder name="Artist" />} />

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

        {/* Static pages — Phase 4 */}
        <Route path="/:slug" element={<Placeholder name="Page" />} />
      </Routes>
    </AuthProvider>
  );
}
