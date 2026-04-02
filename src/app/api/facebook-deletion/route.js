import { NextResponse } from "next/server";
import crypto from "crypto";

function parseSignedRequest(signedRequest, appSecret) {
  const [encodedSig, payload] = signedRequest.split(".");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const expectedSig = crypto
    .createHmac("sha256", appSecret)
    .update(payload)
    .digest("base64url");
  if (encodedSig !== expectedSig) return null;
  return data;
}

export async function POST(request) {
  try {
    const body = await request.formData();
    const signedRequest = body.get("signed_request");

    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const data = appSecret
      ? parseSignedRequest(signedRequest, appSecret)
      : { user_id: "unknown" };

    if (!data) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const userId = data.user_id;
    const confirmationCode = `del_${userId}_${Date.now()}`;
    const statusUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://futbolaficionado.michiclana.es"}/eliminacion-datos?code=${confirmationCode}`;

    // Aquí podrías añadir lógica para borrar el usuario de Supabase si lo deseas
    // await supabase.from("perfiles").delete().eq("facebook_id", userId);

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
