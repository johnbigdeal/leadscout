import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Client uploads: el navegador sube el binario directo a Vercel Blob, evitando el
 * límite de ~4.5 MB del body de la función serverless. Esta ruta solo firma un
 * token de corta duración tras validar auth, tipo y tamaño.
 */
const KIND = {
  image: {
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    maximumSizeInBytes: 8 * 1024 * 1024,
  },
  proof: {
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    maximumSizeInBytes: 15 * 1024 * 1024,
  },
  lesson: {
    allowedContentTypes: ["application/pdf"],
    maximumSizeInBytes: 50 * 1024 * 1024,
  },
} as const;

/* POST /api/upload — genera el client token para subir a Vercel Blob */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      request,
      body,
      // Auth DENTRO del callback: handleUpload recibe el Bearer que upload({ headers })
      // reenvía. No colocar requireAuth al tope del handler.
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const result = await requireAuth(request);
        if (result.response) throw new Error("Unauthorized");
        const ctx = result.ctx;

        const kind = (clientPayload ? JSON.parse(clientPayload).kind : "image") as keyof typeof KIND;
        const cfg = KIND[kind] ?? KIND.image;

        return {
          allowedContentTypes: [...cfg.allowedContentTypes],
          maximumSizeInBytes: cfg.maximumSizeInBytes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ orgId: ctx.orgId }),
        };
      },
      // onUploadCompleted: omitido intencionalmente. No dispara en localhost (requiere
      // URL pública) y no lo necesitamos: los call sites persisten la URL desde el cliente.
    });

    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
