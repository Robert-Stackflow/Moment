import boto3
from fastapi import UploadFile


class S3FileStorage:
    def __init__(self, settings: dict):
        self.access_key_id = settings["access_key_id"]
        self.secret_access_key = settings["secret_access_key"]
        self.bucket_name = settings["bucket_name"]
        self.region_name = settings["region_name"]
        self.endpoint_url = settings["endpoint_url"]

    async def save_file(self, file: UploadFile, save_path: str):
        s3 = boto3.client(
            service_name="s3",
            aws_access_key_id=self.access_key_id,
            aws_secret_access_key=self.secret_access_key,
            endpoint_url=self.endpoint_url,
        )
        s3.upload_fileobj(file.file, self.bucket_name, save_path)
