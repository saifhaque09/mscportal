import { useEffect, useState } from "react";
import useUserApi from "@/api/useUserApi";
import { Skeleton } from "@/components/ui/skeleton";

// Backend shape for `/settings/app/file/get` isn't fully pinned down yet — handle
// a plain URL string, a base64/data URI string, or an object carrying url/path.
function resolveLogoSrc(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  return payload.url || payload.path || payload.file_url || payload.logo_url || null;
}

const FallbackText = () => (
  <h1 className="text-xl font-bold text-foreground">
    MSC <span className="text-blue-500">Portal</span>
  </h1>
);

const AppLogo = () => {
  const { getFile } = useUserApi();
  const [logoSrc, setLogoSrc] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | loaded | error

  useEffect(() => {
    let cancelled = false;

    const fetchLogo = async () => {
      const payload = await getFile("logo");
      if (cancelled) return;

      const src = resolveLogoSrc(payload);
      if (src) {
        setLogoSrc(src);
        setStatus("loaded");
      } else {
        setStatus("error");
      }
    };

    fetchLogo();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") {
    return <Skeleton className="h-8 w-32" />;
  }

  if (status === "error" || !logoSrc) {
    return <FallbackText />;
  }

  return (
    <img
      src={logoSrc}
      alt="App logo"
      loading="lazy"
      onError={() => setStatus("error")}
      className="h-8 max-w-[160px] object-contain"
    />
  );
};

export default AppLogo;
