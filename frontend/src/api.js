async function req(method, path, body, isForm = false) {
  const opts = { method, credentials: "include" };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || "Request failed"), { status: res.status });
  }
  if (res.status === 204) return null;
  return res.json();
}

const get  = (path)        => req("GET",    path);
const post = (path, body)  => req("POST",   path, body);
const put  = (path, body)  => req("PUT",    path, body);
const del  = (path)        => req("DELETE", path);
const patch = (path, body) => req("PATCH",  path, body);

export default {
  // Auth
  login:  (password) => post("/api/auth/login", { password }),
  logout: ()         => post("/api/auth/logout"),
  me:     ()         => get("/api/auth/me"),

  // Artists
  getArtists:    ()           => get("/api/admin/artists"),
  getArtist:     (id)         => get(`/api/admin/artists/${id}`),
  createArtist:  (data)       => post("/api/admin/artists", data),
  updateArtist:  (id, data)   => put(`/api/admin/artists/${id}`, data),
  deleteArtist:  (id)         => del(`/api/admin/artists/${id}`),

  // Books
  getBooks:   ()         => get("/api/admin/books"),
  getBook:    (id)       => get(`/api/admin/books/${id}`),
  createBook: (data)     => post("/api/admin/books", data),
  updateBook: (id, data) => put(`/api/admin/books/${id}`, data),
  deleteBook: (id)       => del(`/api/admin/books/${id}`),

  // Images
  uploadImage: (bookId, file, role) => {
    const form = new FormData();
    form.append("file", file);
    form.append("role", role);
    return req("POST", `/api/admin/books/${bookId}/images`, form, true);
  },
  setImageRole:   (bookId, imgId, role) => patch(`/api/admin/books/${bookId}/images/${imgId}?role=${role}`),
  deleteImage:    (bookId, imgId)       => del(`/api/admin/books/${bookId}/images/${imgId}`),
  reorderImages:  (bookId, ids)         => post(`/api/admin/books/${bookId}/images/reorder`, { ids }),
  rotateImage:    (bookId, imgId)       => post(`/api/admin/books/${bookId}/images/${imgId}/rotate`),

  // Links
  addLink:    (bookId, data)         => post(`/api/admin/books/${bookId}/links`, data),
  updateLink: (bookId, linkId, data) => put(`/api/admin/books/${bookId}/links/${linkId}`, data),
  deleteLink: (bookId, linkId)       => del(`/api/admin/books/${bookId}/links/${linkId}`),

  // Tags
  getTags:    ()           => get("/api/admin/tags"),
  createTag:  (name)       => post("/api/admin/tags", { name }),
  updateTag:  (id, name)   => put(`/api/admin/tags/${id}`, { name }),
  deleteTag:  (id)         => del(`/api/admin/tags/${id}`),

  // Pages
  getPages:   ()         => get("/api/admin/pages"),
  getPage:    (id)       => get(`/api/admin/pages/${id}`),
  createPage: (data)     => post("/api/admin/pages", data),
  updatePage: (id, data) => put(`/api/admin/pages/${id}`, data),
  deletePage: (id)       => del(`/api/admin/pages/${id}`),

  // Footer
  getFooter:         ()         => get("/api/admin/footer"),
  createFooterItem:  (data)     => post("/api/admin/footer", data),
  updateFooterItem:  (id, data) => put(`/api/admin/footer/${id}`, data),
  deleteFooterItem:  (id)       => del(`/api/admin/footer/${id}`),
  reorderFooter:     (ids)      => post("/api/admin/footer/reorder", { ids }),

  // Scrape
  scrape:            (url, force = false, bookId = null) => post("/api/admin/scrape", { url, force, book_id: bookId }),
  getBookScrapes:    (bookId) => get(`/api/admin/scrape?book_id=${bookId}`),

  // Download image from URL
  downloadImage: (bookId, url, role) =>
    post(`/api/admin/books/${bookId}/images/from-url`, { url, role }),

  // Image size hints (HEAD requests via backend)
  imageMeta: (urls) => post("/api/admin/image-meta", { urls }),
};
