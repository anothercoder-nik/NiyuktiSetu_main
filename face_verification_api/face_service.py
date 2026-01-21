import cv2
import numpy as np
from deepface import DeepFace
import tensorflow as tf

tf.get_logger().setLevel('ERROR')


def l2_normalize(vec):
    vec = np.array(vec)
    return vec / np.linalg.norm(vec)


def cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2)


def verify_faces(ref_img, live_img, threshold=0.60):
    try:
        ref = DeepFace.represent(
            ref_img,
            model_name="ArcFace",
            detector_backend="mtcnn",
            enforce_detection=True
        )[0]["embedding"]

        live = DeepFace.represent(
            live_img,
            model_name="ArcFace",
            detector_backend="mtcnn",
            enforce_detection=True
        )[0]["embedding"]

    except Exception as e:
        print("Face detection/embedding failed:", e)
        return False, 0

    ref = l2_normalize(ref)
    live = l2_normalize(live)
    score = cosine_similarity(ref, live)

    match = score >= threshold
    return match, score


if __name__ == "__main__":
    ref = input("Enter reference image path: ").strip()  # Update 1

    cam = cv2.VideoCapture(0)
    print("\nKeep your face aligned and press SPACE to capture\n")

    while True:
        ret, frame = cam.read()
        cv2.imshow("Live - Press SPACE", frame)

        if cv2.waitKey(1) == 32:
            live_path = "live_capture.jpg"
            cv2.imwrite(live_path, frame)
            print(f"Saved: {live_path}")
            break

    cam.release()
    cv2.destroyAllWindows()

    threshold = 0.60
    match, score = verify_faces(ref, live_path, threshold)

    print("\n--- RESULT ---")
    print(f"Match: {match}  (Threshold: {threshold})")   # Update 2
    print(f"Similarity Score: {score:.4f}")
