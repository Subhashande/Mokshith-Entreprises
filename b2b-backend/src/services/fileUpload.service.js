export const uploadFile = async (file) => {
  console.log('Uploading file:', file.originalname);

  return {
    url: `/uploads/${file.originalname}`,
  };
};