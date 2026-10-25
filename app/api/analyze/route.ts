import { analyzeFridgePhoto } from "../../lib/analyzeFridgePhoto";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return Response.json({ error: "No image uploaded" }, { status: 400 });
    }
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const result = await analyzeFridgePhoto(base64, file.type);
    return Response.json(result);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
