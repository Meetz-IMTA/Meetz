import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

export const uploadImage = (
  buffer: Buffer,
  folder = "meetz",
): Promise<string> =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image" }, (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve(result.secure_url);
      })
      .end(buffer);
  });

/**
 * Extracts the Cloudinary public_id from a delivery URL, or null if the URL
 * isn't a Cloudinary asset we uploaded (e.g. an external Giphy GIF).
 */
const extractPublicId = (url: string): string | null => {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  // .../upload/(v123/)?<folder>/<id>.<ext>
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match?.[1] ?? null;
};

/** Deletes a single Cloudinary image by its URL. Never throws. */
export const deleteImage = async (
  url: string | null | undefined,
): Promise<void> => {
  if (!url) return;
  const publicId = extractPublicId(url);
  if (!publicId) return; // external URL (Giphy, etc.) — nothing to purge
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error("Cloudinary delete failed for", publicId, err);
  }
};

/** Deletes several Cloudinary images by URL in parallel. Never throws. */
export const deleteImages = async (
  urls: (string | null | undefined)[],
): Promise<void> => {
  await Promise.all(urls.map(deleteImage));
};
