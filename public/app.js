document.addEventListener('DOMContentLoaded', () => {
    const MAX_FILE_SIZE = 32 * 1024 * 1024; // 32MB

    // DOM Elements
    const extractInput = document.getElementById('extract-input');
    const extractDropzone = document.getElementById('extract-dropzone');
    const extractFilesList = document.getElementById('extract-files');
    const extractBtn = document.getElementById('extract-btn');

    const mergeInput = document.getElementById('merge-input');
    const mergeDropzone = document.getElementById('merge-dropzone');
    const mergeFilesList = document.getElementById('merge-files');
    const mergeBtn = document.getElementById('merge-btn');

    const alertContainer = document.getElementById('alert-container');

    // State
    let extractFile = null;
    let mergeFiles = [];

    // --- Utilities ---
    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showAlert = (message, type = 'success') => {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' 
                    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
                    : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
            </svg>
            <span>${message}</span>
        `;
        alertContainer.appendChild(alert);

        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s forwards';
            setTimeout(() => alert.remove(), 300);
        }, 4000);
    };

    const setButtonLoading = (btn, isLoading) => {
        const span = btn.querySelector('span');
        const spinner = btn.querySelector('.spinner');
        if (isLoading) {
            btn.disabled = true;
            span.style.display = 'none';
            spinner.style.display = 'block';
        } else {
            btn.disabled = false;
            span.style.display = 'block';
            spinner.style.display = 'none';
        }
    };

    const triggerDownload = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    };

    // --- Drag and Drop Setup ---
    const setupDropzone = (dropzone, input, onChangeCallback) => {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
        });

        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            input.files = files; // Sync input
            onChangeCallback(files);
        }, false);

        input.addEventListener('change', (e) => {
            onChangeCallback(e.target.files);
        });
    };

    // --- Extract Flow ---
    setupDropzone(extractDropzone, extractInput, (files) => {
        if (files.length > 0) {
            const file = files[0];
            if (file.type !== 'application/pdf') {
                return showAlert('Please upload a PDF file.', 'error');
            }
            if (file.size > MAX_FILE_SIZE) {
                return showAlert('File size must be less than 32MB.', 'error');
            }
            extractFile = file;
            extractFilesList.style.display = 'flex';
            extractFilesList.innerHTML = `
                <div class="file-item">
                    <span class="file-name">${file.name}</span>
                    <span style="color: var(--text-secondary)">${formatBytes(file.size)}</span>
                </div>
            `;
            extractBtn.disabled = false;
        }
    });

    extractBtn.addEventListener('click', async () => {
        if (!extractFile) return;

        setButtonLoading(extractBtn, true);
        const formData = new FormData();
        formData.append('file', extractFile);

        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to extract images');
            }

            const blob = await response.blob();
            // Try to extract filename from headers, fallback to default
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'extracted_images.zip';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                filename = disposition.split('filename=')[1].replace(/["']/g, '');
            }

            triggerDownload(blob, filename);
            showAlert('Extraction complete!', 'success');
            
            // Reset
            extractFile = null;
            extractInput.value = '';
            extractFilesList.style.display = 'none';
            extractBtn.disabled = true;

        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            setButtonLoading(extractBtn, false);
            // Re-enable button if file is still there
            if (extractFile) extractBtn.disabled = false;
        }
    });


    // --- Merge Flow ---
    setupDropzone(mergeDropzone, mergeInput, (files) => {
        const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (validFiles.length === 0) {
            return showAlert('Please upload image files (JPEG/PNG).', 'error');
        }

        // Calculate total size
        const totalSize = validFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > MAX_FILE_SIZE) {
            return showAlert('Total images size must be less than 32MB.', 'error');
        }

        mergeFiles = validFiles;
        mergeFilesList.style.display = 'flex';
        mergeFilesList.innerHTML = mergeFiles.map(file => `
            <div class="file-item">
                <span class="file-name">${file.name}</span>
                <span style="color: var(--text-secondary)">${formatBytes(file.size)}</span>
            </div>
        `).join('');
        
        mergeBtn.disabled = mergeFiles.length === 0;
    });

    mergeBtn.addEventListener('click', async () => {
        if (mergeFiles.length === 0) return;

        setButtonLoading(mergeBtn, true);
        const formData = new FormData();
        mergeFiles.forEach(file => {
            formData.append('images', file);
        });

        try {
            const response = await fetch('/api/merge', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Failed to compile PDF');
            }

            const blob = await response.blob();
            // Try to extract filename from headers, fallback to default
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'compiled.pdf';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                filename = disposition.split('filename=')[1].replace(/["']/g, '');
            }

            triggerDownload(blob, filename);
            showAlert('PDF compiled successfully!', 'success');
            
            // Reset
            mergeFiles = [];
            mergeInput.value = '';
            mergeFilesList.style.display = 'none';
            mergeBtn.disabled = true;

        } catch (error) {
            showAlert(error.message, 'error');
        } finally {
            setButtonLoading(mergeBtn, false);
            if (mergeFiles.length > 0) mergeBtn.disabled = false;
        }
    });
});
