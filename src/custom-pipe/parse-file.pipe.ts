import {
    ArgumentMetadata,
    BadRequestException,
    Injectable,
    PipeTransform,
  } from '@nestjs/common';
  import { extname } from 'path';
  
  // * Sizes will be in MB here
  
  const IMG_MAX_SIZE = 5;
  const PDF_MAX_SIZE = 8;
  
  @Injectable()
  export class ParseFilePipeCutsom implements PipeTransform {
    private readonly imageExtensions = ['.jpeg', '.jpg', '.png'];
    private readonly documentExtensions = ['.pdf'];
    constructor(private readonly fileType: 'image' | 'document') {}
  
    transform(value: Express.Multer.File): Express.Multer.File {
      let allowedExtensions: string[];
      let maxSize: number;
      if (this.fileType === 'image') {
        allowedExtensions = this.imageExtensions;
        maxSize = IMG_MAX_SIZE;
      } else if (this.fileType === 'document') {
        allowedExtensions = this.documentExtensions;
        maxSize = PDF_MAX_SIZE;
      }
      if (!value) return;
      const extension = extname(value.originalname);
      if (!allowedExtensions.includes(extension))
        throw new BadRequestException(`File type ${extension} not supported`);
  
      const fileSize = value.size / (1024 * 1024);
      if (fileSize > maxSize)
        throw new BadRequestException(
          `File size should be less than ${maxSize}MB`,
        );
  
      return value;
    }
  }
  
  export class ParseFilesPipeCutsom
    implements PipeTransform<Express.Multer.File[]>
  {
    private readonly pipe: ParseFilePipeCutsom;
    constructor(fileType: 'image' | 'document') {
      this.pipe = new ParseFilePipeCutsom(fileType);
    }
  
    transform(
      files: Express.Multer.File[] | { [key: string]: Express.Multer.File },
    ) {
      let filesArr: any = files;
      if (typeof files === 'object') {
        filesArr = Object.values(files);
        filesArr = filesArr.flat();
      }
      for (const file of filesArr) this.pipe.transform(file);
      return files;
    }
  }
  