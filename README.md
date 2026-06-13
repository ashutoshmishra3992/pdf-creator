# PDF Creator

A modern, serverless web application to extract images from PDFs and compile images into a single PDF document.

**Live Demo:** [https://pdf-creator-56045.web.app](https://pdf-creator-56045.web.app)

![PDF Creator Demo](https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop) *(Placeholder for App Screenshot)*

## Features

- **Extract from PDF:** Securely extract all embedded images from any PDF document natively, and download them packaged in a ZIP archive.
- **Images to PDF:** Upload multiple JPEG/PNG images, convert them securely, and compile them sequentially into a single downloadable PDF.
- **Modern UI:** Built using standard Vanilla JS and CSS, featuring drag-and-drop zones, glassmorphism, fluid animations, and a sleek dark mode.
- **Serverless Backend:** Built purely on Firebase Cloud Functions (2nd Gen) with the Python 3.11 Runtime to ensure scalability without server management overhead.

## Architecture

- **Frontend Engine:** Vanilla HTML5, CSS3, and JavaScript
- **Backend Environment:** Firebase Cloud Functions (Python 3.11)
- **Deployment:** Firebase Hosting (Frontend) & Google Cloud Run (Backend)
- **Key Libraries:** `PyMuPDF` (Extraction), `Pillow` (Image Processing), `Werkzeug` (Multipart Handling)

## Local Development

### Prerequisites
- Node.js & npm (for Firebase CLI)
- Python 3.11+

### Setup

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Python Environment:**
   ```bash
   cd functions
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Run the Firebase Emulators:**
   ```bash
   # From the project root
   firebase emulators:start
   ```
   *The local frontend will be available at `http://127.0.0.1:5000` (or `5002`), automatically communicating with the emulated backend.*

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
