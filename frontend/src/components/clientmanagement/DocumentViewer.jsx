'use client'
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { useEffect } from "react";

/**
 * Detect mime type from a filename/URL. Signed streaming URLs like
 * /files/{id}/stream?expires=... carry no file extension at all, so the
 * real filename (when available) must be tried first — falling back to
 * the URL only lets every one of those signed URLs go undetected.
 */
function getFileTypeFromUrl(url, fileName) {
  const cleanUrl = (fileName || url).split("?")[0];
  const ext = cleanUrl.split(".").pop()?.toLowerCase();

  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",

    pdf: "application/pdf",

    doc: "application/msword",
    docx:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    xls: "application/vnd.ms-excel",
    xlsx:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  return map[ext];
}

export default function DocumentViewer({ documents }) {
  useEffect(() => {
    const fixHeight = () => {
      const viewer = document.querySelector("#react-doc-viewer");
      const iframe = document.querySelector("#react-doc-viewer iframe");

      if (viewer) viewer.style.height = "100%";
      if (iframe) {
        iframe.style.height = "100%";
        iframe.style.minHeight = "600px";
      }
    };

    fixHeight();
    const timer = setTimeout(fixHeight, 500);
    return () => clearTimeout(timer);
  }, [documents]);

  const transformedDocuments = documents?.map((doc) => {
    const displayName =
      doc?.title ?? doc?.file_title ?? doc?.fileName ?? doc?.file_name;

    if (doc.uri && (doc.uri.startsWith("http") || doc.uri.includes("s3"))) {
      return {
        ...doc,
        uri: `/api/proxy-document?url=${encodeURIComponent(doc.uri)}&t=${Date.now()}`,
        fileType: getFileTypeFromUrl(doc.uri, displayName),
        ...(displayName ? { fileName: displayName } : {}),
      };
    }

    return {
      ...doc,
      ...(displayName ? { fileName: displayName } : {}),
    };
  });

  return (
   <div className="w-full h-full min-h-0 flex flex-col">
      <DocViewer
        documents={transformedDocuments}
        pluginRenderers={DocViewerRenderers}
        config={{
          header: {
            disableHeader: false,
            disableFileName: false,
            retainURLParams: false,
          },
        }}
        // style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}
