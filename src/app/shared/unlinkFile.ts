import fs from 'fs';
import path from 'path';

const unlinkFile = (file: string) => {
  const filePath = path.join('uploads', file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default unlinkFile;


export const extractPathFromUrl = (url: string) => {
  const parsedUrl = new URL(url);
  return parsedUrl.pathname;
};

export const unlinkFiles = (files: any) => {
  if (files) {
    const filesObj = files as Record<string, any[]>;
    Object.keys(filesObj).forEach((key) => {
      const fileList = filesObj[key];
      if (Array.isArray(fileList)) {
        fileList.forEach((file) => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
    });
  }
};
