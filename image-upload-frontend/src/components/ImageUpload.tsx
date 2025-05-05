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

					channel.bind('message', function (eventData: any) {
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

	// ... existing code ...
	return (
		<div className="image-upload-bg">
			<div className="upload-card">
				<div className="upload-controls">
					<input
						type="file"
						accept="image/*"
						id="file-input"
						onChange={handleFileSelect}
						disabled={uploading}
						style={{ display: 'none' }}
					/>
					<label htmlFor="file-input" className={`custom-file-label ${uploading ? 'disabled' : ''}`}>
						{selectedFile ? selectedFile.name : 'Choose an image...'}
					</label>
					<button
						onClick={handleUpload}
						disabled={!selectedFile || uploading}
						className="upload-btn"
					>
						{uploading ? (
							<span>
								<span className="loader"></span> Uploading...
							</span>
						) : (
							'Upload'
						)}
					</button>
				</div>

				{preview && (
					<div className="preview-container">
						<h3>Preview:</h3>
						<img src={preview} alt="Preview" className="preview-img" />
					</div>
				)}

				{waitingForPdf && (
					<div className="message info">
						<span className="material-icons">hourglass_top</span>
						Processing file, please wait...
					</div>
				)}

				{pdfUrl && (
					<div className="message success">
						<span className="material-icons">check_circle</span>
						PDF file received:&nbsp;
						<a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-link">
							<span className="material-icons">picture_as_pdf</span> View PDF
						</a>
					</div>
				)}

				{message && !waitingForPdf && !pdfUrl && (
					<div className={`message ${message.includes('Error') ? 'error' : 'info'}`}>
						<span className="material-icons">
							{message.includes('Error') ? 'error' : 'info'}
						</span>
						{message}
					</div>
				)}

				<style>{`
		  @import url('https://fonts.googleapis.com/icon?family=Material+Icons');
		  .image-upload-bg {
			min-height: 100vh;
			background: #181a20;
			display: flex;
			align-items: center;
			justify-content: center;
		  }
		  .upload-card {
			background: #23262f;
			border-radius: 16px;
			box-shadow: 0 4px 24px rgba(0,0,0,0.25);
			max-width: 340px;
			width: 100%;
			margin: 0 auto;
			padding: 28px 20px 22px 20px;
			display: flex;
			flex-direction: column;
			align-items: center;
		  }
		  .title {
			color: #fff;
			margin-bottom: 18px;
			font-size: 1.3rem;
			font-weight: 600;
			letter-spacing: 1px;
			text-align: center;
		  }
		  .upload-controls {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 16px;
			width: 100%;
		  }
		  .custom-file-label {
			background: #181a20;
			border-radius: 6px;
			padding: 8px 12px;
			cursor: pointer;
			border: 1px solid #353945;
			color: #fff;
			transition: background 0.2s;
			flex: 1;
			text-align: left;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
			font-size: 0.95rem;
		  }
		  .custom-file-label.disabled {
			opacity: 0.6;
			pointer-events: none;
		  }
		  .upload-btn {
			background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
			color: #181a20;
			border: none;
			border-radius: 6px;
			padding: 8px 16px;
			font-weight: 600;
			cursor: pointer;
			transition: box-shadow 0.2s, background 0.2s;
			box-shadow: 0 2px 8px rgba(67,233,123,0.08);
			display: flex;
			align-items: center;
			gap: 6px;
			font-size: 0.95rem;
		  }
		  .upload-btn:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		  }
		  .loader {
			border: 2px solid #353945;
			border-top: 2px solid #43e97b;
			border-radius: 50%;
			width: 16px;
			height: 16px;
			animation: spin 1s linear infinite;
			display: inline-block;
			vertical-align: middle;
			margin-right: 6px;
		  }
		  @keyframes spin {
			0% { transform: rotate(0deg);}
			100% { transform: rotate(360deg);}
		  }
		  .preview-container {
			margin: 14px 0 0 0;
			text-align: center;
			width: 100%;
		  }
		  .preview-container h3 {
			color: #b1b5c3;
			font-size: 1rem;
			margin-bottom: 8px;
		  }
		  .preview-img {
			max-width: 180px;
			border-radius: 10px;
			border: 1.5px solid #353945;
			box-shadow: 0 2px 8px rgba(44,62,80,0.10);
		  }
		  .message {
			padding: 10px 12px;
			margin: 16px 0 0 0;
			border-radius: 8px;
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 0.98rem;
			font-weight: 500;
			width: 100%;
			word-break: break-all;
		  }
		  .message.info {
			background: #23262f;
			color: #45aaf2;
			border: 1px solid #353945;
		  }
		  .message.success {
			background: #232f2e;
			color: #43e97b;
			border: 1px solid #43e97b;
		  }
		  .message.error {
			background: #2d1a1a;
			color: #ff7675;
			border: 1px solid #c62828;
		  }
		  .pdf-link {
			color: #45aaf2;
			font-weight: 600;
			text-decoration: none;
			display: inline-flex;
			align-items: center;
			gap: 4px;
			margin-left: 4px;
		  }
		  .pdf-link:hover {
			text-decoration: underline;
			color: #43e97b;
		  }
		  .material-icons {
			font-size: 1.2em;
			vertical-align: middle;
		  }
		`}</style>
			</div>
		</div>
	);
	// ... existing code ...
};

export default ImageUpload;