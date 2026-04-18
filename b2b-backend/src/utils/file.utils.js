import path from 'path';

export const getFileExtension = (filename) => {
  return path.extname(filename).slice(1);
};