import sys
import io
import os
from PIL import Image

sys.path.append(os.path.abspath('functions'))
import main
from unittest.mock import Mock

def test_extract():
    # 1. Create a dummy PDF with PyMuPDF
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    # Let's insert a dummy image
    img = Image.new('RGB', (100, 100), color = 'red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    page.insert_image(fitz.Rect(0, 0, 100, 100), stream=img_bytes.read())
    pdf_bytes = doc.write()
    doc.close()

    # 2. Mock a request
    mock_req = Mock()
    mock_req.method = "POST"
    
    class MockFile:
        def __init__(self, data):
            self.data = data
        def read(self):
            return self.data
            
    mock_req.files = {"file": MockFile(pdf_bytes)}

    # 3. Call extract_jpeg_from_pdf
    res = main.extract_jpeg_from_pdf(mock_req)
    
    # 4. Verify response
    if res.status_code != 200:
        print(f"Failed extract: {res.status_code}")
        return
        
    print("Extract Response Status: 200")
    print(f"Extract Content-Type: {res.headers.get('Content-Type', res.mimetype)}")
    
    import zipfile
    z = zipfile.ZipFile(io.BytesIO(res.response[0] if isinstance(res.response, (list, tuple)) else res.get_data()))
    names = z.namelist()
    print(f"Extracted {len(names)} files: {names}")


def test_merge():
    # 1. Create dummy JPEGs
    img1 = Image.new('RGB', (100, 100), color = 'blue')
    img1_bytes = io.BytesIO()
    img1.save(img1_bytes, format='JPEG')
    
    img2 = Image.new('RGB', (100, 100), color = 'green')
    img2_bytes = io.BytesIO()
    img2.save(img2_bytes, format='JPEG')

    # 2. Mock a request
    mock_req = Mock()
    mock_req.method = "POST"
    
    class MockFile:
        def __init__(self, data):
            self.data = data
        def read(self):
            return self.data
            
    mock_req.files = Mock()
    mock_req.files.getlist.side_effect = lambda key: [MockFile(img1_bytes.getvalue()), MockFile(img2_bytes.getvalue())] if key == "images" else []

    # 3. Call create_pdf_from_jpegs
    res = main.create_pdf_from_jpegs(mock_req)
    
    # 4. Verify response
    if res.status_code != 200:
        print(f"Failed merge: {res.status_code}")
        return
        
    print("Merge Response Status: 200")
    print(f"Merge Content-Type: {res.headers.get('Content-Type', res.mimetype)}")
    
    data = res.response[0] if isinstance(res.response, (list, tuple)) else res.get_data()
    print(f"Generated PDF Size: {len(data)} bytes")
    
if __name__ == '__main__':
    print("Running tests...")
    test_extract()
    print("---")
    test_merge()
