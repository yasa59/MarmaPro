# server/py/marma_detect_cli.py
# pip install opencv-python numpy pillow
import sys, os, json, cv2, numpy as np
from PIL import Image

def load_img(p):
    img = cv2.imread(p)
    if img is None:
        img = cv2.cvtColor(np.array(Image.open(p).convert("RGB")), cv2.COLOR_RGB2BGR)
    return img

def detect_feet_bounds(gray):
    # very simple segmentation (works for most plain backgrounds)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    _, th = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV+cv2.THRESH_OTSU)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, np.ones((5,5),np.uint8), iterations=2)
    contours,_ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours: return []
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    feet = []
    for c in contours[:2]:
        x,y,w,h = cv2.boundingRect(c)
        if w*h > gray.shape[0]*gray.shape[1]*0.03:
            feet.append((x,y,w,h))
    feet.sort(key=lambda b:b[0])
    return feet

def marma_points_for_bbox(x,y,w,h, imgw, imgh):
    # heuristic positions on a sole bounding box
    px = lambda r: int(x + w*r)
    py = lambda r: int(y + h*r)
    pts = [
        ("Kshipra Marma",   px(0.78), py(0.18)),
        ("Kurcha Marma",    px(0.50), py(0.55)),
        ("Talahridaya Marma",px(0.50), py(0.85)),
        ("Kurchashira Marma",px(0.65), py(0.35)),
    ]
    out=[]
    for label,cx,cy in pts:
        cx = max(7, min(cx, imgw-7))
        cy = max(7, min(cy, imgh-7))
        out.append({"x": cx-7, "y": cy-7, "width": 14, "height": 14, "label": label})
    return out

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "usage: marma_detect_cli.py <imagePath>"}))
        return
    in_path = sys.argv[1]
    if not os.path.exists(in_path):
        print(json.dumps({"ok": False, "error": "file not found"}))
        return

    img = load_img(in_path)
    h,w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    feet = detect_feet_bounds(gray)
    boxes=[]
    for fb in feet:
        boxes += marma_points_for_bbox(*fb, w, h)

    # draw
    out_path = os.path.splitext(in_path)[0] + "_annotated.jpg"
    for b in boxes:
        x,y,ww,hh = b["x"], b["y"], b["width"], b["height"]
        cv2.rectangle(img, (x,y), (x+ww,y+hh), (0,255,255), 2)
        cv2.circle(img, (x+ww//2, y+hh//2), 3, (0,0,255), -1)
        cv2.putText(img, b["label"], (x, max(12, y-6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255,255,255), 1)
    cv2.imwrite(out_path, img)

    print(json.dumps({"ok": True, "boxes": boxes, "annotated_path": out_path}).strip())

if __name__ == "__main__":
    main()
