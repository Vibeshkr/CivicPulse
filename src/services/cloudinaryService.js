
const CLOUD_NAME = "gdxwaoip";
const UPLOAD_PRESET = "civicpulse_uploads";

export const uploadMedia = async (
  file,
  folder = "civicpulse/reports"
) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Media uploads are currently unavailable. Please try again later."
    );
  }

  if (!file) {
    throw new Error(
      "Please select an image or video to upload."
    );
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error(
      "Please select a supported image or video file."
    );
  }

  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (
    (isImage && !allowedImageTypes.includes(file.type)) ||
    (isVideo && !allowedVideoTypes.includes(file.type))
  ) {
    throw new Error(
      "Supported formats: JPG, PNG, WEBP, MP4, WEBM and MOV."
    );
  }

  const maxSize = isImage
    ? 5 * 1024 * 1024
    : 25 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      isImage
        ? "Images must be 5 MB or smaller."
        : "Videos must be 25 MB or smaller."
    );
  }

  const resourceType = isVideo ? "video" : "image";
  const mediaName = isImage ? "image" : "video";

  const endpoint =
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/` +
    `${resourceType}/upload`;

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  let response;
  let result;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    result = await response.json().catch(() => ({}));
  } catch {
    throw new Error(
      `Unable to upload your ${mediaName}. Check your internet connection and try again.`
    );
  }

  if (!response.ok) {
    // Do not expose Cloudinary's technical error to the user.
    throw new Error(
      `Unable to upload your ${mediaName}. Please try again.`
    );
  }

  if (!result.secure_url || !result.public_id) {
    throw new Error(
      `Your ${mediaName} could not be uploaded. Please try again.`
    );
  }

  return {
    url: result.secure_url,
    type: resourceType,
    resourceType: result.resource_type,
    format: result.format,
    originalFilename: result.original_filename,
    bytes: result.bytes,
    publicId: result.public_id,
    uploadedAt: new Date().toISOString(),
  };
};
