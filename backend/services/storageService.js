import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

export const uploadToS3 = async (fileBuffer, fileName, fileType) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `bugbox-uploads/${Date.now()}-${fileName}`,
      Body: fileBuffer,
      ContentType: fileType,
      ACL: 'public-read',
    };

    const data = await s3.upload(params).promise();
    return data.Location; // Returns the public URL
  } catch (error) {
    console.error('S3 Upload Error:', error.message);
    throw new Error(`S3 Upload failed: ${error.message}`);
  }
};

export const deleteFromS3 = async (fileUrl) => {
  try {
    const key = fileUrl.split('/').pop();
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `bugbox-uploads/${key}`,
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error.message);
    throw new Error(`S3 Delete failed: ${error.message}`);
  }
};

export const generatePresignedUrl = async (fileName, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `bugbox-uploads/${fileName}`,
      Expires: expiresIn,
    };

    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.error('Presigned URL Error:', error.message);
    throw new Error(`Presigned URL generation failed: ${error.message}`);
  }
};

export const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
};
