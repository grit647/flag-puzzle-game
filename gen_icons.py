from PIL import Image, ImageDraw
import math

def rounded_rect(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)

def jigsaw_piece_path(size, pad):
    # วาดรูปทรงชิ้นจิ๊กซอง่ายๆ: สี่เหลี่ยมมีปุ่มด้านบน-ขวา ร่องด้านล่าง-ซ้าย
    w = size - pad * 2
    x0, y0 = pad, pad
    x1, y1 = pad + w, pad + w
    tab = w * 0.22
    pts = []
    # บน-ซ้าย -> บน-ขวา (มีปุ่มตรงกลาง)
    midx = (x0 + x1) / 2
    steps = 24
    pts.append((x0, y0))
    pts.append((midx - tab, y0))
    for i in range(steps + 1):
        a = math.pi * i / steps
        cx = midx
        cy = y0 - tab * 0.9
        pts.append((cx - tab * math.cos(a), cy + tab * math.sin(a) * 0 - (tab * 0.0)))
    pts.append((midx + tab, y0))
    pts.append((x1, y0))
    # ขวา-บน -> ขวา-ล่าง (มีปุ่มตรงกลาง)
    midy = (y0 + y1) / 2
    pts.append((x1, midy - tab))
    for i in range(steps + 1):
        a = math.pi * i / steps
        pts.append((x1 + tab * math.sin(a), midy - tab * math.cos(a)))
    pts.append((x1, midy + tab))
    pts.append((x1, y1))
    # ล่าง-ขวา -> ล่าง-ซ้าย (มีร่องตรงกลาง)
    pts.append((midx + tab, y1))
    for i in range(steps + 1):
        a = math.pi * i / steps
        pts.append((midx + tab * math.cos(a), y1 + tab * math.sin(a)))
    pts.append((midx - tab, y1))
    pts.append((x0, y1))
    # ซ้าย-ล่าง -> ซ้าย-บน (มีร่องตรงกลาง)
    pts.append((x0, midy + tab))
    for i in range(steps + 1):
        a = math.pi * i / steps
        pts.append((x0 - tab * math.sin(a), midy + tab * math.cos(a)))
    pts.append((x0, midy - tab))
    pts.append((x0, y0))
    return pts

def make_icon(size, out_path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, (0, 0, size, size), radius=int(size * 0.22), fill=(37, 99, 235, 255))  # #2563eb
    pad = size * 0.16
    pts = jigsaw_piece_path(size, pad)
    draw.polygon(pts, fill=(255, 255, 255, 255))
    # ลายธงเล็กๆ ตรงกลางชิ้น (แดง-ขาว-น้ำเงิน) ให้สื่อว่าเป็นเกมธง
    stripe_w = size * 0.5
    stripe_h = size * 0.09
    sx = (size - stripe_w) / 2
    sy = size * 0.42
    colors = [(165, 28, 48, 255), (241, 245, 249, 255), (30, 41, 59, 255)]
    for i, c in enumerate(colors):
        draw.rectangle((sx, sy + i * stripe_h, sx + stripe_w, sy + (i + 1) * stripe_h), fill=c)
    img.save(out_path)

make_icon(192, 'icon-192.png')
make_icon(512, 'icon-512.png')
print('done')
