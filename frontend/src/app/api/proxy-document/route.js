import { NextResponse } from "next/server";

/**
 * IMPORTANT:
 * Netlify must use Node runtime for binary streaming
 */
export const runtime = "nodejs";

/**
 * Resolve content-type and disposition safely
 */
function getFileMeta(url, upstreamType) {
  const cleanUrl = url.split("?")[0];
  const lastSegment = cleanUrl.split("/").pop() || "file";
  const dotIdx = lastSegment.lastIndexOf(".");
  const segExt = dotIdx !== -1 ? lastSegment.slice(dotIdx + 1).toLowerCase() : "";

  const mimeMap = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",

    pdf: "application/pdf",

    txt: "text/plain",
    csv: "text/csv",

    doc: "application/msword",
    docx:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    xls: "application/vnd.ms-excel",
    xlsx:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    ppt: "application/vnd.ms-powerpoint",
    pptx:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
  };

  const mimeToExt = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/zip": "zip",
    "application/vnd.rar": "rar",
    "application/x-7z-compressed": "7z",
  };

  const normalizedUpstream = upstreamType?.split(";")[0].trim();
  const contentType =
    (segExt && mimeMap[segExt]) || normalizedUpstream || "application/octet-stream";

  const inlineTypes = [
    "image/",
    "application/pdf",
    "text/plain",
    "text/csv",
  ];

  const disposition = inlineTypes.some((t) =>
    contentType.startsWith(t)
  )
    ? "inline"
    : "attachment";

  // If the URL's last segment has no recognized extension, append one inferred from content type
  let filename = lastSegment;
  if (!segExt || !mimeMap[segExt]) {
    const inferredExt = mimeToExt[contentType];
    if (inferredExt) filename = `${filename}.${inferredExt}`;
  }

  return { contentType, disposition, filename };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentUrl = searchParams.get("url");
    const forceDownload = searchParams.get("download") === "true";

    if (!documentUrl) {
      return NextResponse.json(
        { error: "Document URL is required" },
        { status: 400 }
      );
    }

    /**
     * Auth token handling (cookie or Authorization header)
     */
    const cookieToken = request.cookies.get("access_token")?.value;
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.replace("Bearer ", "");
    const finalToken = cookieToken || bearerToken;

    const headers = {
      "User-Agent": "MSC-Portal/1.0",
    };

    if (finalToken) {
      headers.Authorization = `Bearer ${finalToken}`;
    }

    /**

     */
    const response = await fetch(decodeURIComponent(documentUrl), {
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch document (${response.status})`,
        },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    const upstreamType = response.headers.get("content-type");

    const { contentType, disposition: autoDisposition, filename } = getFileMeta(
      documentUrl,
      upstreamType
    );
    const disposition = forceDownload ? "attachment" : autoDisposition;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
         "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Document proxy error:", error);
    return NextResponse.json(
      { error: "Failed to proxy document" },
      { status: 500 }
    );
  }
}
