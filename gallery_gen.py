import os
import glob
from datetime import datetime

# Configuration
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(ROOT_DIR, "Assets", "Concepts")
OUTPUT_FILE = os.path.join(ASSETS_DIR, "index.html")

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PiPos Concept Art Gallery</title>
    <style>
        :root {{
            --bg: #121212;
            --card: #1e1e1e;
            --text: #e0e0e0;
            --accent: #3f51b5;
        }}
        body {{
            font-family: 'Segoe UI', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 20px;
        }}
        h1 {{ border-bottom: 2px solid var(--accent); padding-bottom: 10px; }}
        h2 {{ margin-top: 40px; color: #888; }}
        .gallery {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }}
        .card {{
            background: var(--card);
            border-radius: 8px;
            overflow: hidden;
            transition: transform 0.2s;
            cursor: pointer;
        }}
        .card:hover {{ transform: scale(1.02); }}
        .card img {{
            width: 100%;
            height: 200px;
            object-fit: cover;
            display: block;
        }}
        .card .info {{ padding: 10px; font-size: 0.9em; }}
        .filename {{ font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
        
        /* Lightbox */
        .lightbox {{
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }}
        .lightbox img {{
            max-width: 90%;
            max-height: 90%;
            border: 2px solid var(--text);
            border-radius: 4px;
        }}
        .lightbox:target {{ display: flex; }}
    </style>
</head>
<body>
    <h1>PiPos Concept Art</h1>

    <!-- DYNAMIC CONTENT START -->
    {content}
    <!-- DYNAMIC CONTENT END -->

    <div id="lightbox" class="lightbox" onclick="this.style.display='none'">
        <img id="lb_img" src="">
    </div>

    <script>
        function showImage(src) {{
            document.getElementById('lb_img').src = src;
            document.getElementById('lightbox').style.display = 'flex';
        }}
    </script>
</body>
</html>
"""

def scan_images():
    # Structure: { 'Keepers': [files], 'Sessions/2026-01-12': [files] }
    groups = {}
    
    # Walk through Assets/Concepts
    for root, dirs, files in os.walk(ASSETS_DIR):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                # Get relative path from Concept root
                rel_dir = os.path.relpath(root, ASSETS_DIR)
                if rel_dir == ".": rel_dir = "Unsorted"
                
                if rel_dir not in groups: groups[rel_dir] = []
                
                full_path = os.path.join(root, file)
                # Relative path for HTML src
                html_path = os.path.relpath(full_path, ASSETS_DIR).replace("\\", "/")
                groups[rel_dir].append({'name': file, 'path': html_path})

    return groups

def build_gallery():
    groups = scan_images()
    html_content = ""
    
    # Sort groups: Keepers first, then Sessions (newest first)
    sorted_keys = sorted(groups.keys(), key=lambda x: (x != "Keepers", x), reverse=True)
    if "Keepers" in groups:
        sorted_keys.remove("Keepers")
        sorted_keys.insert(0, "Keepers")
        
    for group in sorted_keys:
        if not groups[group]: continue
        html_content += f"<h2>{group}</h2><div class='gallery'>"
        for img in groups[group]:
            html_content += f"""
            <div class='card' onclick="showImage('{img['path']}')">
                <img src="{img['path']}" loading="lazy">
                <div class='info'>
                    <div class='filename'>{img['name']}</div>
                </div>
            </div>
            """
        html_content += "</div>"
    
    final_html = HTML_TEMPLATE.format(content=html_content)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(final_html)
    
    print(f"[SUCCESS] Gallery generated at: {OUTPUT_FILE}")

if __name__ == "__main__":
    build_gallery()
