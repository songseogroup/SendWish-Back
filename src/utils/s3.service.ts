// s3.service.ts

import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import s3Config from './s3.config';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;
  constructor(private configService: ConfigService) {
    const accessId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('AWS_REGION');
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME');
    this.s3 = new AWS.S3({
      accessKeyId: accessId,
      secretAccessKey: secretAccessKey,
      region: region,
    });
  }

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    const stream = new Readable();
    stream._read = () => {};
    stream.push(file.buffer);
    stream.push(null);
    let key = `${uuidv4()}-${file.originalname}`;
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: stream,
    };

    try {
      await this.s3.upload(params).promise();
      return key;
    } catch (error) {
      console.error('Error uploading document to S3:', error);
      throw new Error('Failed to upload document to S3');
    }
  }
  async generateSignedUrl(key: string | String): Promise<string> {
    try {
      // Generate a signed URL with one-year expiration
      const signedUrlParams = {
        Bucket: this.bucketName,
        Key: key,
        // Set the Expires parameter to one year in seconds
        Expires: 604800, // 1 year in seconds
      };
      const getUrl = await this.s3.getSignedUrlPromise(
        'getObject',
        signedUrlParams,
      );

      return getUrl;
    } catch (e) {
      console.error('Error generating signed URL:', e);
      throw new Error('Failed to generate signed URL for image');
    }
  }
}