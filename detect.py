import sys
import json
import os

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python detect.py <image_path> <output_path>"}))
        return

    image_path = sys.argv[1]
    output_path = sys.argv[2]

    try:
        import cv2
        import numpy as np
        from ultralytics import YOLO

        # Load model
        model_path = os.path.join(os.path.dirname(__file__), 'model', 'best.pt')
        if not os.path.exists(model_path):
            print(json.dumps({"success": False, "error": f"Weights not found at {model_path}"}))
            return

        model = YOLO(model_path)
        frame = cv2.imread(image_path)
        if frame is None:
            print(json.dumps({"success": False, "error": f"Failed to load image at {image_path}"}))
            return

        # Predict
        results = model.predict(source=frame, imgsz=640, conf=0.25, verbose=False)
        result = results[0]
        
        # Save output image
        processed_frame = result.plot(boxes=True)
        cv2.imwrite(output_path, processed_frame)

        # Count potholes
        pothole_count = len(result.boxes) if result.boxes is not None else 0

        # Calculate percentage damage area
        percentage_damage = 0.0
        if result.masks is not None:
            total_area = 0
            masks = result.masks.data.cpu().numpy()
            image_area = frame.shape[0] * frame.shape[1]
            for mask in masks:
                # Resize mask to original frame shape if it is downscaled
                mask_resized = cv2.resize(mask, (frame.shape[1], frame.shape[0]))
                binary_mask = (mask_resized > 0.5).astype(np.uint8) * 255
                contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                for contour in contours:
                    total_area += cv2.contourArea(contour)
            percentage_damage = (total_area / image_area) * 100.0

        # Estimate severity
        if pothole_count == 0:
            severity = "Low"
            description = "No significant road hazards or potholes detected."
        elif pothole_count <= 2 and percentage_damage < 3.0:
            severity = "Moderate"
            description = f"Minor road damage detected. Found {pothole_count} localized pothole(s) covering approximately {percentage_damage:.1f}% of the road segment surface."
        elif pothole_count <= 4 or percentage_damage < 8.0:
            severity = "High"
            description = f"Significant road surface damage. Detected {pothole_count} active potholes with a total surface impact of {percentage_damage:.1f}%. Recommended for repair dispatcher queue."
        else:
            severity = "Critical"
            description = f"Severe road surface degradation. Detected {pothole_count} active potholes covering {percentage_damage:.1f}% of the road segment. High hazard risk for commuters, urgent dispatcher priority required."

        print(json.dumps({
            "success": True,
            "pothole_count": pothole_count,
            "damage_percentage": round(percentage_damage, 2),
            "severity": severity,
            "description": description,
            "annotated_image_path": output_path
        }))

    except ImportError as e:
        print(json.dumps({
            "success": False,
            "error": "MissingDependencies",
            "message": str(e)
        }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == '__main__':
    main()
