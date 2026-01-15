"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import crypto from "crypto";

/**
 * Upload image to Cloudinary
 * @param imageData - Base64 encoded image data (data:image/jpeg;base64,...)
 * @param folder - Optional folder path (default: 'travel-tour/avatars')
 * @param transformation - Optional transformation string
 * @returns Cloudinary URL of uploaded image
 */
export const uploadImageToCloudinary = action({
  args: {
    imageData: v.string(), // Base64 encoded image with data URI prefix
    folder: v.optional(v.string()), // Optional folder path
    transformation: v.optional(v.string()), // Optional transformation
  },
  handler: async (ctx, args) => {
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    if (!CLOUDINARY_CLOUD_NAME) {
      throw new Error("Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME in Convex environment variables.");
    }

    try {
      const folderPath = args.folder || 'travel-tour/avatars';
      const transformation = args.transformation || 'w_800,h_600,c_fill,q_auto'; // Default: 800x600 for blog images
      
      console.log(`[uploadImageToCloudinary] Uploading to Cloudinary...`);
      console.log(`[uploadImageToCloudinary] Cloud name: ${CLOUDINARY_CLOUD_NAME}`);
      console.log(`[uploadImageToCloudinary] Folder: ${folderPath}`);
      console.log(`[uploadImageToCloudinary] Upload preset: ${uploadPreset || 'none (using signed upload)'}`);
      console.log(`[uploadImageToCloudinary] Image data length: ${args.imageData.length}`);
      
      // Build form data - Cloudinary accepts data URI directly
      const formData = new URLSearchParams();
      formData.append('file', args.imageData);
      formData.append('folder', folderPath);
      formData.append('transformation', transformation);

      // Use signed upload with API key/secret (more reliable than unsigned preset)
      if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
        // Use signed upload - generate signature
        const timestamp = Math.round(new Date().getTime() / 1000);
        const params: Record<string, string> = {
          folder: folderPath,
          transformation: transformation,
          timestamp: timestamp.toString(),
        };
        
        // Create signature string (sorted keys)
        const signatureString = Object.keys(params)
          .sort()
          .map(key => `${key}=${params[key]}`)
          .join('&') + CLOUDINARY_API_SECRET;
        
        // Generate SHA1 signature
        const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
        
        formData.append('api_key', CLOUDINARY_API_KEY);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        
        console.log(`[uploadImageToCloudinary] Using signed upload with API key`);
      } else if (uploadPreset) {
        // Fallback to unsigned upload with preset
        formData.append('upload_preset', uploadPreset);
        console.log(`[uploadImageToCloudinary] Using unsigned upload with preset: ${uploadPreset}`);
      } else {
        throw new Error("Either CLOUDINARY_UPLOAD_PRESET (for unsigned upload) or both CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET (for signed upload) must be configured.");
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      console.log(`[uploadImageToCloudinary] Upload URL: ${uploadUrl}`);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
      
      console.log(`[uploadImageToCloudinary] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[uploadImageToCloudinary] Cloudinary error ${response.status}:`, errorText);
        throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`[uploadImageToCloudinary] ✅ Upload successful: ${data.secure_url}`);

      return {
        url: data.secure_url,
        publicId: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format,
      };
    } catch (error: any) {
      console.error("[uploadImageToCloudinary] ❌ Error:", error?.message || error);
      throw new Error(`Failed to upload image: ${error?.message || 'Unknown error'}`);
    }
  },
});
