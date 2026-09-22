from pathlib import Path
from PIL import Image
# quiz solved 
assets = Path('/home/ubuntu/devnox/client/public/assets')
for source_name, target_name, max_size in [
    ('civic-hero.png', 'civic-hero.webp', (1600, 900)),
    ('civic-empty.png', 'civic-empty.webp', (640, 640)),
    ('civic-routing.png', 'civic-routing.webp', (1200, 800)),
    ('civic-patterns.png', 'civic-patterns.webp', (1200, 800)),
    ('civic-trust.png', 'civic-trust.webp', (1200, 800)),
]:
    source = assets / source_name
    target = assets / target_name
    image = Image.open(source).convert('RGB')
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    image.save(target, 'WEBP', quality=84, method=6)
    print(f'{source_name}: {image.size} -> {target_name}: {target.stat().st_size} bytes')
