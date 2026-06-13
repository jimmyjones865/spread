import { useState, useEffect } from "react";
import api from "../api";

export function useCuration(bookId, { onImagesAdded, onAddToBook }) {
  const [url, setUrl] = useState("");
  const [scrape, setScrape] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [imageSizes, setImageSizes] = useState({});
  const [imageReachable, setImageReachable] = useState({});
  const [imageDims, setImageDims] = useState({});
  const [coverUrl, setCoverUrl] = useState(null);
  const [spreadUrls, setSpreadUrls] = useState([]);
  const [descBlocks, setDescBlocks] = useState(new Set());
  const [colophonBlocks, setColophonBlocks] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [addProgress, setAddProgress] = useState(null);
  const [addError, setAddError] = useState(null);
  const [addDone, setAddDone] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getBookScrapes(bookId).then(setHistory).catch(() => {});
  }, [bookId]);

  useEffect(() => {
    if (!sizesLoaded || !scrape) return;
    const trimmed = url.trim();
    setHistory(prev => prev.map(h =>
      h.url === trimmed ? { ...h, image_count: visibleImageUrls.length } : h
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizesLoaded]);

  async function doScrape(force = false) {
    if (!url.trim()) return;
    setScraping(true);
    setScrapeError(null);
    setAddDone(false);
    setCoverUrl(null);
    setSpreadUrls([]);
    setDescBlocks(new Set());
    setColophonBlocks(new Set());
    try {
      const result = await api.scrape(url.trim(), force, bookId);
      setScrape(result);
      api.getBookScrapes(bookId).then(setHistory).catch(() => {});
      setImageSizes({});
      setImageReachable({});
      setImageDims(result.image_dims ?? {});
      if (result.image_urls.length > 0) {
        api.imageMeta(result.image_urls).then(({ sizes }) => {
          const sizeMap = {};
          const reachableMap = {};
          for (const { url: u, content_length, reachable } of sizes) {
            sizeMap[u] = content_length;
            reachableMap[u] = reachable !== false;
          }
          setImageSizes(sizeMap);
          setImageReachable(reachableMap);
        }).catch(() => {});
      }
    } catch (e) {
      setScrapeError(e.message);
    } finally {
      setScraping(false);
    }
  }

  function toggleCover(imgUrl) {
    if (coverUrl === imgUrl) {
      setCoverUrl(null);
    } else {
      setCoverUrl(imgUrl);
      setSpreadUrls(prev => prev.filter(u => u !== imgUrl));
    }
  }

  function toggleSpread(imgUrl) {
    if (spreadUrls.includes(imgUrl)) {
      setSpreadUrls(prev => prev.filter(u => u !== imgUrl));
    } else {
      setSpreadUrls(prev => [...prev, imgUrl]);
      if (coverUrl === imgUrl) setCoverUrl(null);
    }
  }

  function toggleField(field, i) {
    const setFn = field === "desc" ? setDescBlocks : setColophonBlocks;
    setFn(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  async function addToBook() {
    setAdding(true);
    setAddError(null);
    setAddDone(false);
    try {
      const toDownload = [];
      if (coverUrl) toDownload.push({ url: coverUrl, role: "cover" });
      for (const u of spreadUrls) toDownload.push({ url: u, role: "spread" });
      for (let i = 0; i < toDownload.length; i++) {
        setAddProgress({ current: i + 1, total: toDownload.length });
        const { url: imgUrl, role } = toDownload[i];
        await api.downloadImage(bookId, imgUrl, role);
      }
      if (toDownload.length > 0) onImagesAdded();
      const descText = scrape
        ? scrape.text_blocks.filter((_, i) => descBlocks.has(i)).join("\n\n")
        : "";
      const colophonText = scrape
        ? scrape.text_blocks.filter((_, i) => colophonBlocks.has(i)).join("\n\n")
        : "";
      await onAddToBook(descText || null, colophonText || null);
      setCoverUrl(null);
      setSpreadUrls([]);
      setDescBlocks(new Set());
      setColophonBlocks(new Set());
      setAddDone(true);
    } catch (e) {
      setAddError(e.message);
    } finally {
      setAdding(false);
      setAddProgress(null);
    }
  }

  const MIN_IMAGE_BYTES = 20 * 1024;
  const MIN_IMAGE_PX = 400;
  const sizesLoaded = Object.keys(imageSizes).length > 0;
  const visibleImageUrls = !scrape ? [] : !sizesLoaded ? scrape.image_urls : scrape.image_urls.filter(imgUrl => {
    if (imageReachable[imgUrl] === false) return false;
    const size = imageSizes[imgUrl];
    if (size != null && size < MIN_IMAGE_BYTES) return false;
    const d = imageDims[imgUrl];
    if (d && Math.max(d.w, d.h) < MIN_IMAGE_PX) return false;
    return true;
  });
  const hiddenCount = scrape && sizesLoaded ? scrape.image_urls.length - visibleImageUrls.length : 0;
  const imageCount = (coverUrl ? 1 : 0) + spreadUrls.length;
  const descText = scrape
    ? scrape.text_blocks.filter((_, i) => descBlocks.has(i)).join("\n\n")
    : "";
  const colophonText = scrape
    ? scrape.text_blocks.filter((_, i) => colophonBlocks.has(i)).join("\n\n")
    : "";
  const hasAnything = imageCount > 0 || descBlocks.size > 0 || colophonBlocks.size > 0;

  return {
    url, setUrl,
    scrape, scraping, scrapeError,
    imageSizes, imageReachable, imageDims, setImageDims,
    coverUrl, spreadUrls,
    descBlocks, colophonBlocks,
    adding, addProgress, addError, addDone,
    history,
    doScrape, toggleCover, toggleSpread, toggleField, addToBook,
    sizesLoaded, visibleImageUrls, hiddenCount,
    imageCount, descText, colophonText, hasAnything,
  };
}
