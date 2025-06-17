'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { FaFileUpload, FaSpinner, FaCheckCircle } from 'react-icons/fa';

interface AttachmentUploaderProps {
  parentId: string; // ID of the parent document (e.g., taskId, subtaskId)
  storagePath: string; // The path in Firebase Storage (e.g., 'jobs/attachments')
  onUploadComplete: (attachment: { url: string; name: string; type: string; }) => void; // Callback after successful upload
}

export default function AttachmentUploader({ parentId, storagePath, onUploadComplete }: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadedFile(null);
    setUploadProgress(0);

    const storageRef = ref(storage, `${storagePath}/${parentId}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setError(`Upload failed: ${error.message}`);
        setUploading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const newAttachment = {
          name: file.name,
          url: downloadURL,
          type: file.type,
          createdAt: new Date().toISOString(),
        };

        // Here you would typically update a Firestore document with the new attachment info.
        // For reusability, we will call the onUploadComplete callback.
        onUploadComplete(newAttachment);

        setUploadedFile({ name: file.name, url: downloadURL });
        setUploading(false);
      }
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png'],
    },
  });

  return (
    <div className="w-full p-4 border-2 border-dashed rounded-lg text-center transition-colors duration-200 ease-in-out
      ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}">
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center justify-center">
            <FaSpinner className="animate-spin text-4xl text-blue-500" />
            <p className="mt-2 text-sm text-gray-600">Uploading...</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        ) : uploadedFile ? (
          <div className="flex flex-col items-center justify-center text-green-600">
            <FaCheckCircle className="text-4xl" />
            <p className="mt-2 text-sm">Successfully uploaded!</p>
            <p className="text-xs font-mono truncate max-w-full">{uploadedFile.name}</p>
            <button
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                className="mt-2 text-xs text-blue-500 hover:underline"
            >
                Upload another file
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <FaFileUpload className="text-4xl text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {isDragActive ? "Drop the file here ..." : "Drag & drop a file here, or click to select"}
            </p>
            <p className="text-xs text-gray-500">PDF, JPG, PNG</p>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
} 