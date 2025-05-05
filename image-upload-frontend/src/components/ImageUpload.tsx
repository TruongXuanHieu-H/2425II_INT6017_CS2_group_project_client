import React, { useState } from 'react';
import { config } from '../config/config';
import Pusher from 'pusher-js';

const ImageUpload: React.FC = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string>('');
	const [uploading, setUploading] = useState(false);
	const [message, setMessage] = useState<string>('');
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [waitingForPdf, setWaitingForPdf] = useState(false);

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

			console.log(response)


			if (response.ok) {
				let data = await response.json();
				if (data.pdf_url) {
					setPdfUrl(data.pdf_url);
					setMessage('Đã nhận được file PDF!');
				} else if (data.upload_status == 301) {
					setMessage('Đang xử lý file, vui lòng chờ...');
					setWaitingForPdf(true);
					
					const gcsResponse = await fetch(data.gcs_presigned_url, {
						method: 'PUT',
						headers: {
							'Content-Type': 'application/octet-stream',
						},
						body: selectedFile,
					});

					const pusher = new Pusher(config.pusherKey, {
						cluster: config.pusherCluster,
						forceTLS: true,
						enabledTransports: ['ws'], 
					});

					const channel = pusher.subscribe(data.job_uuid);

					channel.bind('message', function(eventData: any) {
						if (eventData && eventData.file_url) {
							setPdfUrl(eventData.file_url);
							setMessage('Đã nhận được file PDF!');
							setWaitingForPdf(false);
						} else {
							setMessage('Đã nhận kết quả từ backend: ' + JSON.stringify(eventData));
							setWaitingForPdf(false);
						}
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

			{waitingForPdf && (
				<div className="message">
					Đang xử lý file, vui lòng chờ...
				</div>
			)}

			{pdfUrl && (
				<div className="message success">
					Đã nhận được file PDF: <a href={pdfUrl} target="_blank" rel="noopener noreferrer">{pdfUrl}</a>
				</div>
			)}

			{message && !waitingForPdf && !pdfUrl && (
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