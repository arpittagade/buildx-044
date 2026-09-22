from pathlib import Path
from PIL import Image

assets = Path('/home/ubuntu/devnox/client/public/assets')
for source_name, target_name, max_size in [
    ('civic-hero.png', 'civic-hero.webp', (1600, 900)),
    ('civic-empty.png', 'civic-empty.webp', (640, 640)),
]:
    source = assets / source_name
    target = assets / target_name
    image = Image.open(source).convert('RGB')
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    image.save(target, 'WEBP', quality=84, method=6)
    print(f'{source_name}: {image.size} -> {target_name}: {target.stat().st_size} bytes')
