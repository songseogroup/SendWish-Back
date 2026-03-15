// s3.service.ts (Cloudinary compatible - keeping S3Service name for backward compatibility)

import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  constructor(private configService: ConfigService) {
    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      // Convert buffer to stream for Cloudinary
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Automatically detect image, video, etc.
          folder: 'sendwish', // Optional: organize files in a folder
        },
        (error, result) => {
          if (error) {
            console.error('Error uploading document to Cloudinary:', error);
            reject(new Error('Failed to upload document to Cloudinary'));
          } else {
            // Store the public_id (Cloudinary's identifier) which we can use to generate URLs
            resolve(result.public_id);
          }
        },
      );

      // Convert buffer to stream
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(stream);
    });
  }

  async generateSignedUrl(publicId: string | String): Promise<string> {
    try {
      // Cloudinary automatically provides public URLs
      // The public_id is what we stored, so we can generate the URL directly
      const url = cloudinary.url(publicId.toString(), {
        secure: true, // Use HTTPS
        resource_type: 'image', // Must be 'image' so the URL path is /image/upload/ (browsers reject /auto/upload/)
      });

      return url;
    } catch (e) {
      console.error('Error generating Cloudinary URL:', e);
      throw new Error('Failed to generate URL for image');
    }
  }
}