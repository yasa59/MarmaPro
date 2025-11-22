# server/py/marma_detect_improved.py
# Improved marma point detection with better accuracy
# pip install opencv-python numpy pillow

import sys, os, json, cv2, numpy as np
from PIL import Image

def load_img(p):
    img = cv2.imread(p)
    if img is None:
        img = cv2.cvtColor(np.array(Image.open(p).convert("RGB")), cv2.COLOR_RGB2BGR)
    return img

def detect_foot_orientation(contour, img_shape):
    """Detect if foot is left/right and rotation angle"""
    # Get minimum area rectangle
    rect = cv2.minAreaRect(contour)
    angle = rect[2]
    box = cv2.boxPoints(rect)
    box = np.int0(box)
    
    # Calculate foot direction (longer side)
    width = rect[1][0]
    height = rect[1][1]
    is_rotated = width < height
    
    # Determine left/right based on contour centroid and orientation
    M = cv2.moments(contour)
    if M["m00"] != 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
    else:
        cx, cy = 0, 0
    
    return angle, is_rotated, (cx, cy)

def improved_foot_segmentation(gray):
    """Better foot segmentation using multiple techniques"""
    # Method 1: Adaptive thresholding (works better with varying lighting)
    adaptive_thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Method 2: Otsu thresholding (for uniform backgrounds)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    _, otsu_thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Method 3: Edge-based detection
    edges = cv2.Canny(blur, 50, 150)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)
    
    # Combine methods
    combined = cv2.bitwise_or(adaptive_thresh, otsu_thresh)
    combined = cv2.bitwise_or(combined, edges)
    
    # Morphological operations to clean up
    kernel = np.ones((5, 5), np.uint8)
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=3)
    combined = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=2)
    
    # Find contours
    contours, _ = cv2.findContours(combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return []
    
    # Filter and sort by area
    min_area = gray.shape[0] * gray.shape[1] * 0.02  # At least 2% of image
    feet = []
    
    for c in contours:
        area = cv2.contourArea(c)
        if area > min_area:
            x, y, w, h = cv2.boundingRect(c)
            # Aspect ratio check (feet are roughly rectangular)
            aspect_ratio = max(w, h) / min(w, h) if min(w, h) > 0 else 0
            if 1.2 < aspect_ratio < 4.0:  # Reasonable foot aspect ratio
                feet.append({
                    'bbox': (x, y, w, h),
                    'contour': c,
                    'area': area
                })
    
    # Sort by area and take top 2 (left and right foot)
    feet.sort(key=lambda f: f['area'], reverse=True)
    return feet[:2]

def detect_anatomical_landmarks(foot_img, bbox):
    """Detect key anatomical features: toes, heel, arch"""
    x, y, w, h = bbox
    foot_roi = foot_img[y:y+h, x:x+w]
    
    if foot_roi.size == 0:
        return {}
    
    gray_roi = cv2.cvtColor(foot_roi, cv2.COLOR_BGR2GRAY) if len(foot_roi.shape) == 3 else foot_roi
    
    landmarks = {}
    
    # Detect heel (bottom center, darkest/thickest area)
    bottom_region = gray_roi[int(h*0.7):, int(w*0.3):int(w*0.7)]
    if bottom_region.size > 0:
        heel_y, heel_x = np.unravel_index(
            np.argmax(bottom_region), bottom_region.shape
        )
        landmarks['heel'] = (x + int(w*0.3) + heel_x, y + int(h*0.7) + heel_y)
    
    # Detect toe region (top area, multiple peaks)
    top_region = gray_roi[:int(h*0.3), :]
    if top_region.size > 0:
        # Find peaks in top region
        row_sums = np.sum(top_region, axis=1)
        if len(row_sums) > 0:
            toe_row = np.argmin(row_sums)  # Darkest row (between toes)
            landmarks['toe_line'] = (x + w//2, y + toe_row)
    
    # Detect arch (middle, usually lighter/thinner)
    middle_region = gray_roi[int(h*0.3):int(h*0.7), int(w*0.2):int(w*0.8)]
    if middle_region.size > 0:
        arch_y, arch_x = np.unravel_index(
            np.argmin(middle_region), middle_region.shape
        )
        landmarks['arch'] = (x + int(w*0.2) + arch_x, y + int(h*0.3) + arch_y)
    
    return landmarks

def calculate_marma_points_improved(bbox, landmarks, img_shape, is_left_foot=False):
    """Calculate marma points using anatomical landmarks for better accuracy"""
    x, y, w, h = bbox
    imgw, imgh = img_shape[:2] if len(img_shape) > 2 else img_shape
    
    # Use landmarks if available, otherwise fall back to improved heuristics
    heel = landmarks.get('heel', (x + w//2, y + int(h*0.9)))
    toe_line = landmarks.get('toe_line', (x + w//2, y + int(h*0.15)))
    arch = landmarks.get('arch', (x + w//2, y + int(h*0.5)))
    
    # Calculate marma points based on anatomical relationships
    # These are more accurate than fixed percentages
    
    # Kshipra Marma: Between first and second toe (top, slightly to the side)
    kshipra_x = toe_line[0] + int(w * 0.15) if not is_left_foot else toe_line[0] - int(w * 0.15)
    kshipra_y = toe_line[1]
    
    # Kurcha Marma: Heel region (center of heel)
    kurcha_x = heel[0]
    kurcha_y = heel[1] - int(h * 0.1)  # Slightly above heel bottom
    
    # Talahridaya Marma: Sole center (between arch and heel)
    talahridaya_x = (arch[0] + heel[0]) // 2
    talahridaya_y = (arch[1] + heel[1]) // 2
    
    # Kurchashira Marma: Achilles area (back of heel, slightly up)
    kurchashira_x = heel[0]
    kurchashira_y = heel[1] - int(h * 0.25)
    
    pts = [
        ("Kshipra Marma", kshipra_x, kshipra_y),
        ("Kurcha Marma", kurcha_x, kurcha_y),
        ("Talahridaya Marma", talahridaya_x, talahridaya_y),
        ("Kurchashira Marma", kurchashira_x, kurchashira_y),
    ]
    
    out = []
    for label, cx, cy in pts:
        # Ensure points are within image bounds
        cx = max(10, min(cx, imgw - 10))
        cy = max(10, min(cy, imgh - 10))
        out.append({
            "x": cx - 10,
            "y": cy - 10,
            "width": 20,
            "height": 20,
            "label": label,
            "confidence": 0.85  # Add confidence score
        })
    
    return out

def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"ok": False, "error": "usage: marma_detect_improved.py <imagePath>"}))
            return
        
        in_path = sys.argv[1]
        if not os.path.exists(in_path):
            print(json.dumps({"ok": False, "error": "file not found"}))
            return
        
        img = load_img(in_path)
        if img is None:
            print(json.dumps({"ok": False, "error": "Could not load image. Invalid file format."}))
            return
        
        h, w = img.shape[:2]
        if h == 0 or w == 0:
            print(json.dumps({"ok": False, "error": "Invalid image dimensions"}))
            return
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        
        # Improved foot detection
        feet_data = improved_foot_segmentation(gray)
        
        if not feet_data:
            print(json.dumps({"ok": False, "error": "No feet detected. Try better lighting or plain background."}))
            return
        
        all_boxes = []
        
        for i, foot_data in enumerate(feet_data):
            try:
                bbox = foot_data['bbox']
                contour = foot_data['contour']
                
                # Detect foot orientation
                angle, is_rotated, centroid = detect_foot_orientation(contour, img.shape)
                is_left_foot = (i == 0 and centroid[0] < w // 2) or (i == 1)
                
                # Detect anatomical landmarks
                landmarks = detect_anatomical_landmarks(img, bbox)
                
                # Calculate marma points with improved accuracy
                boxes = calculate_marma_points_improved(bbox, landmarks, img.shape, is_left_foot)
                all_boxes.extend(boxes)
            except Exception as e:
                # Skip this foot if there's an error, continue with others
                continue
        
        if not all_boxes:
            print(json.dumps({"ok": False, "error": "Could not detect marma points on detected feet."}))
            return
        
        # Draw annotated image
        out_path = os.path.splitext(in_path)[0] + "_annotated.jpg"
        annotated_img = img.copy()
        
        for b in all_boxes:
            x, y, ww, hh = b["x"], b["y"], b["width"], b["height"]
            cx, cy = x + ww//2, y + hh//2
            
            # Draw box
            cv2.rectangle(annotated_img, (x, y), (x+ww, y+hh), (0, 255, 255), 2)
            # Draw center point
            cv2.circle(annotated_img, (cx, cy), 5, (0, 0, 255), -1)
            # Draw label with background
            label = b["label"]
            (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated_img, (x, y-text_h-8), (x+text_w+4, y), (0, 0, 0), -1)
            cv2.putText(annotated_img, label, (x+2, y-4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        cv2.imwrite(out_path, annotated_img)
        
        print(json.dumps({
            "ok": True,
            "boxes": all_boxes,
            "annotated_path": out_path,
            "feet_detected": len(feet_data)
        }).strip())
    except Exception as e:
        print(json.dumps({
            "ok": False,
            "error": f"Detection error: {str(e)}"
        }))

if __name__ == "__main__":
    main()



