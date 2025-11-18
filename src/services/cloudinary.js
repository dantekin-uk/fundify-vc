// Client-side Cloudinary upload helper (unsigned uploads using an upload preset)
// Requires the following env vars set in .env.local or the hosting environment:
// REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET

export async function uploadFileToCloudinary(file) {
  if (!file) throw new Error('No file provided');
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary not configured. Set REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);

  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  // Return essential fields
  return { url: data.secure_url, public_id: data.public_id, raw: data };
}

export async function uploadFiles(files = []) {
  const arr = Array.from(files || []);
  const results = [];
  for (const f of arr) {
    // only upload File objects
    if (f && typeof f === 'object' && 'size' in f) {
      const r = await uploadFileToCloudinary(f);
      results.push(r);
    }
  }
  return results;
}
