import React, { useState } from 'react';
import { config } from '../config/config';

const ImageUpload: React.FC = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string>('');
	const [uploading, setUploading] = useState(false);
	const [message, setMessage] = useState<string>('');

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files[0]) {
			const file = event.target.files[0];
			setSelectedFile(file);
			
			setMessage('');

			// Create preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleUpload = async () => {
		if (!selectedFile) {
			setMessage('Please select a file first');
			return;
		}

		setUploading(true);
		setMessage('');

		const formData = new FormData();
		formData.append('file', selectedFile);

		try {
			const response = await fetch(config.backendUrl, {
				method: 'POST',
				body: formData,
			});


			if (response.ok) {
				let data = await response.json();
				if (data.upload_status == 300) {
					setMessage(data.pdf_url);
				} else if (data.upload_status == 301) {
					const gcsResponse = await fetch(data.gcs_presigned_url, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/octet-stream',
						},
						body: selectedFile,
					});
					
				} else {
					setMessage('Error in message receiving');
				}
			} else {
				setMessage('Failed to upload image');
			}
		} catch (error) {
			setMessage('Error uploading image: ' + error);
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="image-upload-container">
			<h2>Image Upload</h2>
			<div className="upload-controls">
				<input
					type="file"
					accept="image/*"
					onChange={handleFileSelect}
					disabled={uploading}
				/>
				<button
					onClick={handleUpload}
					disabled={!selectedFile || uploading}
				>
					{uploading ? 'Uploading...' : 'Upload'}
				</button>
			</div>

			{preview && (
				<div className="preview-container">
					<h3>Preview:</h3>
					<img src={preview} alt="Preview" style={{ maxWidth: '300px' }} />
				</div>
			)}

			{message && (
				<div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
					{message}
				</div>
			)}

			<style>{`
				.image-upload-container {
				padding: 20px;
				max-width: 600px;
				margin: 0 auto;
				}
				.upload-controls {
				margin: 20px 0;
				}
				.preview-container {
				margin: 20px 0;
				}
				.message {
				padding: 10px;
				margin: 10px 0;
				border-radius: 4px;
				}
				.error {
				background-color: #ffebee;
				color: #c62828;
				}
				.success {
				background-color: #e8f5e9;
				color: #2e7d32;
				}
      		`}</style>
		</div>
	);
};

export default ImageUpload;