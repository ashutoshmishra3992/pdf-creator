import os
import io
import zipfile
from firebase_functions import https_fn
from firebase_admin import initialize_app
import fitz  # PyMuPDF
from PIL import Image

initialize_app()

@https_fn.on_request(max_instances=10, memory=512)
def extract_jpeg_from_pdf(req: https_fn.Request) -> https_fn.Response:
    if req.method != "POST":
        return https_fn.Response("Method not allowed", status=405)

    try:
        # req.files contains the uploaded files in a Werkzeug request
        if not req.files or "file" not in req.files:
            return https_fn.Response("No PDF file provided", status=400)
            
        pdf_file = req.files["file"]
        
        # Read the PDF into PyMuPDF
        pdf_bytes = pdf_file.read()
        doc = fitz.open("pdf", pdf_bytes)
        
        # Create an in-memory zip file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            img_index = 1
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                image_list = page.get_images(full=True)
                
                for img in image_list:
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    
                    filename = f"image_{img_index}.{image_ext}"
                    zip_file.writestr(filename, image_bytes)
                    img_index += 1
                    
        zip_buffer.seek(0)
        
        return https_fn.Response(
            zip_buffer.read(),
            mimetype="application/zip",
            headers={"Content-Disposition": "attachment; filename=extracted_images.zip"}
        )

    except Exception as e:
        print(f"Error extracting images: {e}")
        return https_fn.Response(f"Internal server error: {str(e)}", status=500)


@https_fn.on_request(max_instances=10, memory=512)
def create_pdf_from_jpegs(req: https_fn.Request) -> https_fn.Response:
    if req.method != "POST":
        return https_fn.Response("Method not allowed", status=405)

    try:
        # We expect files to be uploaded with the key 'images[]' or 'images'
        images = []
        if req.files:
            images = req.files.getlist("images")
            if not images:
                images = req.files.getlist("images[]")
                
        if not images:
            return https_fn.Response("No image files provided", status=400)

        # Open all images using Pillow
        pil_images = []
        for img_file in images:
            img_bytes = img_file.read()
            # Open image from bytes
            img = Image.open(io.BytesIO(img_bytes))
            # Convert to RGB if necessary (PDF requires RGB)
            if img.mode != "RGB":
                img = img.convert("RGB")
            pil_images.append(img)
            
        if not pil_images:
             return https_fn.Response("No valid images found", status=400)

        # Create PDF in memory
        pdf_buffer = io.BytesIO()
        # The first image saves the others as appended pages
        if len(pil_images) > 1:
            pil_images[0].save(
                pdf_buffer, 
                format="PDF", 
                resolution=100.0, 
                save_all=True, 
                append_images=pil_images[1:]
            )
        else:
            pil_images[0].save(
                pdf_buffer, 
                format="PDF", 
                resolution=100.0
            )
        
        pdf_buffer.seek(0)
        
        return https_fn.Response(
            pdf_buffer.read(),
            mimetype="application/pdf",
            headers={"Content-Disposition": "attachment; filename=compiled.pdf"}
        )

    except Exception as e:
        print(f"Error compiling PDF: {e}")
        return https_fn.Response(f"Internal server error: {str(e)}", status=500)
